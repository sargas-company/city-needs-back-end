import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  private readonly model = process.env.OLLAMA_MODEL || 'deepseek-coder';

  async generateResponse(
    messages: OllamaMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    },
  ): Promise<string> {
    try {
      this.logger.log(`Sending request to Ollama (${this.model}) with ${messages.length} messages`);

      // Convert messages to a single prompt for /api/generate
      const prompt = this.convertMessagesToPrompt(messages);

      const response = await axios.post<OllamaGenerateResponse>(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options?.temperature || 0.0,
            num_predict: options?.maxTokens || 4000,
          },
        },
        {
          timeout: 300000, // 5 minutes timeout for large HTML blocks
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const content = response.data.response || '';
      this.logger.log(`Received response from Ollama (${content.length} chars)`);

      return content;
    } catch (error) {
      this.logger.error('Ollama API error:', {
        error,
        method: 'generateResponse',
        service: 'ollama',
        params: { messages, options },
      });
      throw new Error(
        `Failed to communicate with Ollama API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private convertMessagesToPrompt(messages: OllamaMessage[]): string {
    let prompt = '';

    // Add system instruction for HTML to JSX conversion
    prompt += 'You are a HTML to JSX converter. Convert HTML to valid JSX syntax.\n\n';

    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `${message.content}\n\n`;
      }
    }

    return prompt.trim();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch (error) {
      this.logger.warn('Ollama service not available:', {
        error,
        method: 'isAvailable',
        service: 'ollama',
      });
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      this.logger.error('Failed to get Ollama models:', {
        error,
        method: 'getAvailableModels',
        service: 'ollama',
      });
      return [];
    }
  }

  async generateCode(prompt: string): Promise<{ message: string }> {
    const messages: OllamaMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.generateResponse(messages, {
      temperature: 0.0, // Zero temperature for deterministic output
      maxTokens: 8000, // Allow longer responses for complex HTML/JSX
    });

    // Clean up the response to remove any explanations
    let cleanedResponse = response.trim();

    // Remove markdown code blocks first
    cleanedResponse = cleanedResponse
      .replace(/^```(?:jsx|javascript|js|html)?\s*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();

    // Try to extract JSX from the response
    const jsxPatterns = [
      /<[^>]+>.*?<\/[^>]+>/s, // Full JSX elements
      /<[^>]+>/g, // Any HTML-like tags
    ];

    for (const pattern of jsxPatterns) {
      const matches = cleanedResponse.match(pattern);
      if (matches && matches.length > 0) {
        // Find the longest match (most complete JSX)
        const longestMatch = matches.reduce((a, b) => (a.length > b.length ? a : b));
        if (longestMatch.length > 10) {
          // Only use substantial matches
          cleanedResponse = longestMatch;
          break;
        }
      }
    }

    // If still no good JSX found, try to extract from function returns
    const returnMatch = cleanedResponse.match(/return\s*\(?\s*(<[^>]+>.*?<\/[^>]+>)/s);
    if (returnMatch) {
      cleanedResponse = returnMatch[1];
    }

    // Try to extract JSX from component definitions
    const componentMatch = cleanedResponse.match(/<[^>]+>.*?<\/[^>]+>/s);
    if (componentMatch) {
      cleanedResponse = componentMatch[0];
    }

    // Final cleanup - remove any remaining function syntax
    cleanedResponse = cleanedResponse
      .replace(/^function\s+\w+\s*\([^)]*\)\s*{/gm, '')
      .replace(/^const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{/gm, '')
      .replace(/^return\s*\(?\s*/gm, '')
      .replace(/^\s*}\s*;?\s*$/gm, '')
      .replace(/^import\s+.*$/gm, '') // Remove import statements
      .replace(/^export\s+.*$/gm, '') // Remove export statements
      .replace(/^\/\/.*$/gm, '') // Remove comments
      .replace(/^\/\*[\s\S]*?\*\//gm, '') // Remove block comments
      .trim();

    return { message: cleanedResponse };
  }
}
