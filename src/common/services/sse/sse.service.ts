import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

export interface SSEClient {
  userId: string;
  response: Response;
}

export interface SSEEvent {
  type: string;
  data: unknown;
}

@Injectable()
export class SSEService {
  private readonly logger = new Logger(SSEService.name);
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, response: Response): void {
    try {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      response.write('data: {"type":"connection","data":{"status":"connected"}}\n\n');

      const client: SSEClient = { userId, response };

      if (!this.clients.has(userId)) {
        this.clients.set(userId, []);
      }

      this.clients.get(userId)!.push(client);

      this.logger.log(`SSE client connected for user ${userId}`);

      response.on('close', () => {
        this.logger.log(`SSE connection closed for user ${userId}`);
        this.removeClient(userId, response);
      });

      response.on('error', (error) => {
        this.logger.error(`SSE connection error for user ${userId}:`, { error });
        this.removeClient(userId, response);
      });
    } catch (error) {
      this.logger.error(`Failed to add SSE client for user ${userId}:`, {
        error,
        method: 'addClient',
        service: 'sse',
        params: { userId, response },
      });
    }
  }

  removeClient(userId: string, response: Response): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const index = userClients.findIndex((client) => client.response === response);
      if (index !== -1) {
        userClients.splice(index, 1);
        this.logger.log(`SSE client disconnected for user ${userId}`);
      }

      if (userClients.length === 0) {
        this.clients.delete(userId);
      }
    }
  }

  sendToUser(userId: string, event: SSEEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.length === 0) {
      return;
    }

    const eventData = `data: ${JSON.stringify(event)}\n\n`;

    userClients.forEach((client) => {
      try {
        client.response.write(eventData);
      } catch (error) {
        this.logger.error(`Failed to send SSE event to user ${userId}:`, {
          error,
          method: 'sendToUser',
          service: 'sse',
          params: { userId, event },
        });
        this.removeClient(userId, client.response);
      }
    });
  }

  getConnectedUsersCount(): number {
    return this.clients.size;
  }

  getTotalConnectionsCount(): number {
    let count = 0;
    for (const userClients of this.clients.values()) {
      count += userClients.length;
    }
    return count;
  }
}
