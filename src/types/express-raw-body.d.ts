// src/types/express-raw-body.d.ts

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}
export {};
