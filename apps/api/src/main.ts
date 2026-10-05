import 'reflect-metadata';
import { ArgumentsHost, Catch, Controller, ExceptionFilter, Get, HttpException, Module, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { settings } from './config';
import { Db } from './db';
import { CsrfGuard, SessionGuard } from './security';
import { AuthController, AuthService } from './auth';
import { Tasks, TasksController } from './tasks';
import { Events } from './events';
import { MediaController } from './media';
import { NotificationsController } from './notifications';
@Catch()
class Errors implements ExceptionFilter {
  catch(error:unknown,host:ArgumentsHost){let status=500,message:unknown='An unexpected error occurred.';
    if(error instanceof HttpException){status=error.getStatus();const body=error.getResponse();message=typeof body==='string'?body:(body as {message:unknown}).message;}
    if(error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2034'].includes(error.code)){status=409;message='This action conflicts with existing data.';}
    if(status===500)console.error(error instanceof Error?error.name:'Unknown error');
    host.switchToHttp().getResponse<Response>().status(status).json({error:{status,message}});
  }
}
@Controller('health') class HealthController {
  constructor(private db:Db){}
  @Get() health(){return {status:'ok'};}
  @Get('ready') async ready(){try{await this.db.$queryRaw`SELECT 1`;return {status:'ready'};}catch{throw new ServiceUnavailableException('Database unavailable.');}}
}
@Module({controllers:[AuthController,TasksController,MediaController,NotificationsController,HealthController],providers:[Db,AuthService,Tasks,Events,SessionGuard,{provide:APP_GUARD,useClass:CsrfGuard}]})
class AppModule{}
async function main(){
  const app=await NestFactory.create(AppModule);
  app.use(helmet({crossOriginResourcePolicy:{policy:'same-origin'}}));app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));app.useGlobalFilters(new Errors());
  SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('HireHelper API').setVersion('1.0').addCookieAuth('hh_session').build()));
  await app.get(AuthService).ready();app.enableShutdownHooks();await app.listen(settings.port,'0.0.0.0');
}
void main().catch(()=>{console.error('API startup failed. Check configuration, database and SMTP.');process.exitCode=1;});
