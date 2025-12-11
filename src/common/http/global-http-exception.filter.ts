// src/common/http/global-http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { throwSmartErrorResponse } from '../utils/response.util';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    this.logger.error(
      `Unhandled exception on ${req.method} ${req.url}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    let http: HttpException;

    if (exception instanceof HttpException) {
      http = exception;
    } else {
      try {
        throwSmartErrorResponse(exception);
        http = new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      } catch (e) {
        http = e as HttpException;
      }
    }

    const status = http.getStatus();
    const payload = http.getResponse();

    const body =
      typeof payload === 'object'
        ? payload
        : { code: status, details: { message: String(payload) } };

    res.status(status).json({
      ...body,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
