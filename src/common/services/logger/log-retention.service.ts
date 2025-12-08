import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LogRetentionService {
  private readonly logger = new Logger(LogRetentionService.name);
  private readonly baseDir = path.join(process.cwd(), 'logs');
  private readonly levels: Array<'debug' | 'info' | 'warn' | 'error'> = [
    'debug',
    'info',
    'warn',
    'error',
  ];

  private readonly daysToKeep = Number(process.env.LOG_TTL_DAYS ?? 31);

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async cleanupLogs(): Promise<void> {
    const now = new Date();

    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const cutoffDate = new Date(todayUtc);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - this.daysToKeep);

    this.logger.log(
      `Cleaning log files older than ${this.daysToKeep} days (cutoff: ${cutoffDate.toISOString().slice(0, 10)})…`,
    );

    for (const level of this.levels) {
      const dir = path.join(this.baseDir, level);
      if (!fs.existsSync(dir)) continue;

      const files = await fs.promises.readdir(dir);

      for (const file of files) {
        if (!/^\d{4}-\d{2}-\d{2}\.log$/.test(file)) continue;

        const [year, month, day] = file
          .slice(0, 10)
          .split('-')
          .map((v) => Number(v));

        const fileDate = new Date(Date.UTC(year, month - 1, day));

        if (fileDate < cutoffDate) {
          const fullPath = path.join(dir, file);

          try {
            await fs.promises.unlink(fullPath);
            this.logger.debug(`Deleted old log file: ${fullPath}`);
          } catch (err) {
            this.logger.warn(`Failed to delete log file ${fullPath}: ${(err as Error).message}`);
          }
        }
      }
    }

    this.logger.log('Log cleanup complete.');
  }
}
