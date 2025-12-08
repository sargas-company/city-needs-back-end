import { HttpException, HttpStatus } from '@nestjs/common';

export const successResponse = <T>(data: T, code = 200) => ({
  code,
  ...data,
});

export const errorResponse = (error: any, code = 500) => ({
  code,
  details: {
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
  },
});

export const throwSmartErrorResponse = (error: any) => {
  let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let errorCode = 500;

  if (error?.message?.includes('Unauthorized') || error?.message?.includes('authentication')) {
    statusCode = HttpStatus.UNAUTHORIZED;
    errorCode = 401;
  } else if (error?.message?.includes('Forbidden') || error?.message?.includes('permission')) {
    statusCode = HttpStatus.FORBIDDEN;
    errorCode = 403;
  } else if (error?.message?.includes('Not Found') || error?.message?.includes('not found')) {
    statusCode = HttpStatus.NOT_FOUND;
    errorCode = 404;
  } else if (error?.message?.includes('Bad Request') || error?.message?.includes('validation')) {
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = 400;
  }

  throw new HttpException(errorResponse(error, errorCode), statusCode);
};
