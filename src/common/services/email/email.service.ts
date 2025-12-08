import { ClerkClient } from '@clerk/backend';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface SendEmailParams {
  clerkId: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private mailgun: any;
  private domain: string;
  private from: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject('ClerkClient') private readonly clerkClient: ClerkClient,
  ) {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    this.domain = this.configService.get<string>('MAILGUN_DOMAIN') || '';
    this.from = this.configService.get<string>('MAILGUN_FROM_EMAIL') || '';

    if (!apiKey) {
      this.logger.warn('MAILGUN_API_KEY not configured. Email service will not work.');
      return;
    }

    const mailgunClient = new Mailgun(FormData);
    this.mailgun = mailgunClient.client({
      username: 'api',
      key: apiKey,
      url: 'https://api.mailgun.net',
    });
  }

  async sendEmail(params: SendEmailParams): Promise<void> {
    try {
      const user = await this.clerkClient.users.getUser(params.clerkId);

      if (!user.emailAddresses || user.emailAddresses.length === 0) {
        throw new Error(`User ${params.clerkId} has no email addresses`);
      }

      const userEmail = user.emailAddresses[0].emailAddress;

      const processedSubject = this.replacePlaceholders(params.template.subject, params.data);
      const processedHtml = this.replacePlaceholders(params.template.html, params.data);

      await this.mailgun.messages.create(this.domain, {
        from: this.from,
        to: userEmail,
        subject: processedSubject,
        html: processedHtml,
      });

      this.logger.log(`Email sent successfully to ${userEmail} (Clerk ID: ${params.clerkId})`);
    } catch (error) {
      this.logger.error(`Failed to send email to Clerk ID ${params.clerkId}:`, {
        error,
        method: 'sendEmail',
        service: 'email',
        params,
      });
      throw new Error(`Failed to send email: ${(error as Error).message}`);
    }
  }

  private replacePlaceholders(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  async sendBulkEmail(
    clerkIds: string[],
    template: EmailTemplate,
    data: Record<string, any>,
  ): Promise<void> {
    const promises = clerkIds.map((clerkId) => this.sendEmail({ clerkId, template, data }));

    await Promise.allSettled(promises);
  }
}
