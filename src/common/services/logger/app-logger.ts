import * as fs from 'fs';
import * as process from 'node:process';
import * as path from 'path';

import { LoggerService } from '@nestjs/common';
import pino from 'pino';

import { DailyRotateStream } from './daily-rotate.stream';

type AnyContext = Record<string, any> | string | undefined;

export class AppLogger implements LoggerService {
  private readonly prettyTransport: pino.Logger;
  private readonly fileLoggers: Record<'debug' | 'info' | 'warn' | 'error', pino.Logger>;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const isProd = process.env.NODE_ENV === 'production';
    const prettyLogLevel: pino.LevelWithSilent = isProd ? 'info' : 'debug';

    this.prettyTransport = pino(
      {
        level: prettyLogLevel,
      },
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }),
    );

    this.fileLoggers = {
      debug: pino({ level: 'debug' }, new DailyRotateStream(logDir, 'debug')),
      info: pino({ level: 'info' }, new DailyRotateStream(logDir, 'info')),
      warn: pino({ level: 'warn' }, new DailyRotateStream(logDir, 'warn')),
      error: pino({ level: 'error' }, new DailyRotateStream(logDir, 'error')),
    };
  }

  private buildLogEntry(level: string, msg: any, context?: AnyContext): Record<string, any> {
    const entry: Record<string, any> = {
      level,
      timestamp: new Date().toISOString(),
      message: typeof msg === 'string' ? msg : JSON.stringify(msg),
    };

    if (context) {
      if (typeof context === 'string') {
        entry.context = context;
      } else if (typeof context === 'object') {
        const { error, ...rest } = context as { error?: any };
        Object.assign(entry, rest);

        if (error instanceof Error) {
          entry.errorName = error.name;
          entry.errorMessage = error.message;
          entry.stack = error.stack;

          if ((error as any).cause) {
            entry.errorCause = this.serializeError((error as any).cause);
          }
          if ((error as any).code) {
            entry.errorCode = (error as any).code;
          }
          if ((error as any).statusCode) {
            entry.statusCode = (error as any).statusCode;
          }
          if ((error as any).body) {
            entry.errorBody =
              typeof (error as any).body === 'string'
                ? (error as any).body
                : this.serializeError((error as any).body);
          }
          if ((error as any).response) {
            entry.errorResponse = this.serializeError((error as any).response);
          }
        } else if (error && typeof error === 'object') {
          const serialized = this.serializeError(error);
          entry.errorDetails = serialized;
          if (serialized.name) entry.errorName = serialized.name;
          if (serialized.message) entry.errorMessage = serialized.message;
          if (serialized.stack) entry.stack = serialized.stack;
        } else if (typeof error === 'string') {
          entry.errorMessage = error;
        }
      }
    }

    return entry;
  }

  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...((error as any).cause && { cause: this.serializeError((error as any).cause) }),
        ...((error as any).code && { code: (error as any).code }),
        ...((error as any).statusCode && { statusCode: (error as any).statusCode }),
      };
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.parse(
          JSON.stringify(error, (key, value) => {
            if (key === 'stack' && typeof value === 'string') {
              return value;
            }
            if (value instanceof Error) {
              return {
                name: value.name,
                message: value.message,
                stack: value.stack,
              };
            }
            return value;
          }),
        );
      } catch {
        return {
          type: typeof error,
          constructor: error.constructor?.name,
          message: error.message || String(error),
        };
      }
    }
    return error;
  }

  log(message: any, context?: string) {
    const entry = this.buildLogEntry('info', message, context);
    this.fileLoggers.info.info(JSON.stringify(entry));
    this.prettyTransport.info(JSON.stringify(entry));
  }

  error(message: any, trace?: string | Record<string, any>, context?: string) {
    if (trace && typeof trace === 'object' && !(trace instanceof Error)) {
      const entry = this.buildLogEntry('error', message, trace);
      this.fileLoggers.error.error(JSON.stringify(entry));
      this.prettyTransport.error(JSON.stringify(entry));
      return;
    }

    const entry = this.buildLogEntry('error', message, {
      context,
      error: trace ? (typeof trace === 'string' ? new Error(trace) : trace) : undefined,
    });
    this.fileLoggers.error.error(JSON.stringify(entry));
    this.prettyTransport.error(JSON.stringify(entry));
  }

  warn(message: any, context?: string) {
    const entry = this.buildLogEntry('warn', message, context);
    this.fileLoggers.warn.warn(JSON.stringify(entry));
    this.prettyTransport.warn(JSON.stringify(entry));
  }

  debug(message: any, context?: string) {
    const entry = this.buildLogEntry('debug', message, context);
    this.fileLoggers.debug.debug(JSON.stringify(entry));
    this.prettyTransport.debug(JSON.stringify(entry));
  }

  verbose(message: any, context?: string) {
    this.log(message, context);
  }
}
