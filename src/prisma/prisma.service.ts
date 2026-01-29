import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    super({
      adapter,
      // log: ['query', 'error', 'warn'],
    });

    // (this as any).$on('query', (e: any) => {
    //   console.log('🟦 PRISMA QUERY');
    //   console.log(e.query);
    //   console.log('🟨 PARAMS');
    //   console.log(e.params);
    //   console.log('🕒 DURATION:', e.duration, 'ms');
    //   console.log('---------------------------');
    // });

    // (this as any).$on('error', (e: any) => {
    //   console.error('🔴 PRISMA ERROR', e);
    // });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
