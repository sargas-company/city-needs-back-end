import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class DailyRotateStream extends Writable {
  private currentDate: string;
  private stream: fs.WriteStream;

  constructor(
    private readonly baseDir: string,
    private readonly level: LogLevel,
  ) {
    super();
    this.currentDate = this.getDateStamp();
    this.stream = this.createStream();
  }

  private getDateStamp(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private createStream(): fs.WriteStream {
    const levelDir = path.join(this.baseDir, this.level);
    fs.mkdirSync(levelDir, { recursive: true });
    const filePath = path.join(levelDir, `${this.currentDate}.log`);
    return fs.createWriteStream(filePath, { flags: 'a' });
  }

  private rotateIfNeeded(): void {
    const today = this.getDateStamp();
    if (today !== this.currentDate) {
      this.stream.end();
      this.currentDate = today;
      this.stream = this.createStream();
    }
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.rotateIfNeeded();
    this.stream.write(chunk, encoding, callback);
  }
}
