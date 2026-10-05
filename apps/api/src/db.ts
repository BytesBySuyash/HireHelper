import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { settings } from './config';
@Injectable()
export class Db extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(){super({adapter:new PrismaPg({connectionString:settings.databaseUrl})});}
  async onModuleInit(){await this.$connect();}
  async onModuleDestroy(){await this.$disconnect();}
}
