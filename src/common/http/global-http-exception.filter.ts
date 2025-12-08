import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

import { throwSmartErrorResponse } from '../utils/response.util';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    try {
      throwSmartErrorResponse(exception);
    } catch (e) {
      const http = e as HttpException;
      const ctx = host.switchToHttp();
      const res = ctx.getResponse<Response>();
      const req = ctx.getRequest<Request>();

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
}
