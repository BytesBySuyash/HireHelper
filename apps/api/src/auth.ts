import { BadRequestException, Body, Controller, Get, HttpException, Injectable, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OtpPurpose, Prisma } from '@prisma/client';
import { randomInt, randomUUID } from 'node:crypto';
import { Response } from 'express';
import * as argon2 from 'argon2';
import nodemailer from 'nodemailer';
import { Db } from './db';
import { settings } from './config';
import { AuthRequest, cookie, digest, privateUser, same, SessionGuard, token } from './security';
import { ChallengeDto, Credentials, EmailChangeDto, EmailDto, PasswordDto, ProfileDto, Registration, ResetDto, VerifyDto } from './dto';
import { Events } from './events';

@Injectable()
export class AuthService {
  private mail=nodemailer.createTransport(settings.smtp);
  constructor(private db:Db,private events:Events){}
  async ready(){if(settings.production)await this.mail.verify();}
  async limit(key:string,max=10,seconds=900){
    const expires=new Date(Date.now()+seconds*1000);
    const result=await this.db.$queryRaw<{count:number}[]>`INSERT INTO "RateLimit" ("key","count","expiresAt") VALUES (${key},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expiresAt"<NOW() THEN 1 ELSE "RateLimit"."count"+1 END,"expiresAt"=CASE WHEN "RateLimit"."expiresAt"<NOW() THEN ${expires} ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
    if(result[0].count>max)throw new HttpException('Too many attempts. Try again later.',429);
  }
  async issue(userId:string|null,email:string,purpose:OtpPurpose){
    const id=randomUUID(), code=String(randomInt(0,1000000)).padStart(6,'0'), now=new Date();
    await this.db.$transaction(async tx=>{
      // Serialize issue/resend by account and purpose across API instances.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${email}:${purpose}`}))`;
      const recent=await tx.otpChallenge.findFirst({where:{targetEmail:email,purpose},orderBy:{sentAt:'desc'}});
      if(recent && now.getTime()-recent.sentAt.getTime()<60000)throw new HttpException('Wait 60 seconds before requesting another code.',429);
      await tx.otpChallenge.updateMany({where:{targetEmail:email,purpose,consumedAt:null},data:{consumedAt:now}});
      await tx.otpChallenge.create({data:{id,userId,targetEmail:email,purpose,codeHash:digest(`${id}:${purpose}:${userId||'unknown'}:${code}`,settings.otpSecret),expiresAt:new Date(now.getTime()+300000)}});
    });
    if(userId) {
      try {await this.mail.sendMail({from:settings.from,to:email,subject:'Your HireHelper verification code',text:`Your ${purpose.toLowerCase().replace('_',' ')} code is ${code}. It expires in five minutes. If you did not request this, ignore this message.`});}
      catch {await this.db.otpChallenge.update({where:{id},data:{consumedAt:new Date()}});throw new HttpException('Email is temporarily unavailable. Try again later.',503);}
    }
    return {challengeId:id,expiresIn:300,resendAfter:60,message:'If eligible, a code has been sent. Check your inbox.'};
  }
  async register(dto:Registration,ip:string){
    await this.limit(`register:ip:${ip}`,10); await this.limit(`register:email:${digest(dto.email)}`,5);
    if(dto.password!==dto.passwordConfirmation)throw new BadRequestException('Passwords must match.');
    const hash=await argon2.hash(dto.password,{type:argon2.argon2id});
    let user=await this.db.user.findUnique({where:{email:dto.email}});
    if(!user){try{user=await this.db.user.create({data:{firstName:dto.firstName.trim(),lastName:dto.lastName.trim(),email:dto.email,phone:dto.phone,passwordHash:hash}});}catch(e){if(!(e instanceof Prisma.PrismaClientKnownRequestError && e.code==='P2002'))throw e;}}
    // Existing verified accounts receive no registration code; account existence stays private.
    return this.issue(user && !user.emailVerifiedAt?user.id:null,dto.email,'REGISTER');
  }
  async login(dto:Credentials,ip:string){
    await this.limit(`login:ip:${ip}`,30);await this.limit(`login:email:${digest(dto.email)}`,10);
    const user=await this.db.user.findUnique({where:{email:dto.email}});
    // Hash and verify a dummy password to reduce account timing differences.
    const hash=user?.passwordHash ?? await argon2.hash('dummy-password-for-timing',{type:argon2.argon2id});
    const valid=await argon2.verify(hash,dto.password);
    if(!user || !valid)throw new UnauthorizedException('Email or password is incorrect.');
    return this.issue(user.id,user.email,user.emailVerifiedAt?'LOGIN':'REGISTER');
  }
  async forgot(email:string,ip:string){
    await this.limit(`forgot:ip:${ip}`,20);await this.limit(`forgot:email:${digest(email)}`,5);
    const user=await this.db.user.findUnique({where:{email}});
    return this.issue(user?.emailVerifiedAt?user.id:null,email,'RESET');
  }
  async resend(id:string,ip:string){
    await this.limit(`resend:ip:${ip}`,20);
    const c=await this.db.otpChallenge.findUnique({where:{id}});
    if(!c)throw new BadRequestException('Challenge unavailable. Start again.');
    await this.limit(`resend:email:${digest(c.targetEmail)}`,5);
    // Only the current unused challenge may resend. Old codes cannot invalidate a newer code.
    if(c.consumedAt)throw new BadRequestException('Challenge already used. Start again.');
    return this.issue(c.userId,c.targetEmail,c.purpose);
  }
  async verify(dto:VerifyDto,req:AuthRequest,res:Response){
    await this.limit(`verify:ip:${req.ip}`,60);
    const raw=token(), reset=token();
    const result=await this.db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "id" FROM "OtpChallenge" WHERE "id"=${dto.challengeId}::uuid FOR UPDATE`;
      const c=await tx.otpChallenge.findUnique({where:{id:dto.challengeId}});
      if(!c || c.consumedAt || c.expiresAt<=new Date() || c.attempts>=5)return {error:'Code expired or unavailable. Request a new code.'};
      if(!same(c.codeHash,digest(`${c.id}:${c.purpose}:${c.userId||'unknown'}:${dto.code}`,settings.otpSecret)) || !c.userId){
        await tx.otpChallenge.update({where:{id:c.id},data:{attempts:{increment:1}}});
        return {error:'Incorrect code. Codes allow at most five attempts.'};
      }
      await tx.otpChallenge.update({where:{id:c.id},data:{consumedAt:new Date()}});
      if(c.purpose==='RESET'){
        await tx.otpChallenge.update({where:{id:c.id},data:{resetHash:digest(`reset:${reset}`),resetExpiresAt:new Date(Date.now()+600000)}});
        return {authorization:reset};
      }
      if(c.purpose==='EMAIL_CHANGE') {
        if(!req.identity || req.identity.id!==c.userId)return {error:'Sign in to the account that requested this change.'};
        const existing=await tx.user.findUnique({where:{email:c.targetEmail}});
        if(existing && existing.id!==c.userId)return {error:'This address cannot be used.'};
        await tx.user.update({where:{id:c.userId},data:{email:c.targetEmail}});
      }else if(c.purpose==='REGISTER')await tx.user.update({where:{id:c.userId},data:{emailVerifiedAt:new Date()}});
      await tx.session.updateMany({where:c.purpose==='EMAIL_CHANGE'?{userId:c.userId}:{tokenHash:digest(req.cookies?.hh_session||'missing')},data:{revokedAt:new Date()}});
      await tx.session.create({data:{userId:c.userId,tokenHash:digest(raw),expiresAt:new Date(Date.now()+7*86400000)}});
      const user=await tx.user.findUniqueOrThrow({where:{id:c.userId}});
      return {user:privateUser(user)};
    });
    if(result.error)throw new BadRequestException(result.error);
    if(result.user){cookie(res,'hh_session',raw,7*86400000);this.csrf(res);}
    return result;
  }
  csrf(res:Response){const nonce=token(),value=`${nonce}.${digest(`csrf:${nonce}`)}`;cookie(res,'hh_csrf',value,7*86400000,false);return {csrfToken:value};}
  async reset(dto:ResetDto){
    const passwordHash=await argon2.hash(dto.password,{type:argon2.argon2id});
    await this.db.$transaction(async tx=>{
      const rows=await tx.$queryRaw<{id:string}[]>`SELECT "id" FROM "OtpChallenge" WHERE "resetHash"=${digest(`reset:${dto.authorization}`)} FOR UPDATE`;
      const c=rows[0]?await tx.otpChallenge.findUnique({where:{id:rows[0].id}}):null;
      if(!c || c.purpose!=='RESET' || !c.userId || !c.consumedAt || c.resetUsedAt || !c.resetExpiresAt || c.resetExpiresAt<=new Date())throw new BadRequestException('Reset authorization expired. Start again.');
      await tx.user.update({where:{id:c.userId},data:{passwordHash}});
      await tx.otpChallenge.update({where:{id:c.id},data:{resetUsedAt:new Date()}});
      await tx.session.updateMany({where:{userId:c.userId},data:{revokedAt:new Date()}});
    });
    return {message:'Password reset. Sign in with your new password.'};
  }
  async profile(dto:ProfileDto,req:AuthRequest){
    if(dto.avatarId && !await this.db.uploadedFile.findFirst({where:{id:dto.avatarId,ownerId:req.identity!.id,use:'AVATAR'}}))throw new BadRequestException('Avatar unavailable.');
    return privateUser(await this.db.user.update({where:{id:req.identity!.id},data:dto}));
  }
  async password(dto:PasswordDto,req:AuthRequest,res:Response){
    if(!await argon2.verify(req.identity!.passwordHash,dto.currentPassword))throw new BadRequestException('Current password is incorrect.');
    await this.db.$transaction([this.db.user.update({where:{id:req.identity!.id},data:{passwordHash:await argon2.hash(dto.password,{type:argon2.argon2id})}}),this.db.session.updateMany({where:{userId:req.identity!.id},data:{revokedAt:new Date()}})]);
    cookie(res,'hh_session','',0);this.events.close(req.session!.id);return {message:'Password changed. Sign in again.'};
  }
  async changeEmail(dto:EmailChangeDto,req:AuthRequest){
    if(!await argon2.verify(req.identity!.passwordHash,dto.currentPassword))throw new BadRequestException('Current password is incorrect.');
    await this.limit(`email-change:${req.identity!.id}`,5);
    const exists=await this.db.user.findUnique({where:{email:dto.email}});
    return this.issue(exists?null:req.identity!.id,dto.email,'EMAIL_CHANGE');
  }
}
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private auth:AuthService,private db:Db,private events:Events){}
  @Get('csrf') csrf(@Res({passthrough:true})res:Response){return this.auth.csrf(res);}
  @Post('register') register(@Body()dto:Registration,@Req()req:AuthRequest){return this.auth.register(dto,req.ip||'unknown');}
  @Post('login') login(@Body()dto:Credentials,@Req()req:AuthRequest){return this.auth.login(dto,req.ip||'unknown');}
  @Post('forgot') forgot(@Body()dto:EmailDto,@Req()req:AuthRequest){return this.auth.forgot(dto.email,req.ip||'unknown');}
  @Post('resend') resend(@Body()dto:ChallengeDto,@Req()req:AuthRequest){return this.auth.resend(dto.challengeId,req.ip||'unknown');}
  @Post('verify') async verify(@Body()dto:VerifyDto,@Req()req:AuthRequest,@Res({passthrough:true})res:Response){
    // Email changes require an existing session; other purposes intentionally allow unauthenticated verification.
    const c=await this.db.otpChallenge.findUnique({where:{id:dto.challengeId},select:{purpose:true}});
    if(c?.purpose==='EMAIL_CHANGE')await new SessionGuard(this.db).canActivate({switchToHttp:()=>({getRequest:()=>req})} as any);
    return this.auth.verify(dto,req,res);
  }
  @Post('reset') reset(@Body()dto:ResetDto){return this.auth.reset(dto);}
  @UseGuards(SessionGuard) @Get('me') me(@Req()req:AuthRequest){return privateUser(req.identity!);}
  @UseGuards(SessionGuard) @Post('profile') profile(@Body()dto:ProfileDto,@Req()req:AuthRequest){return this.auth.profile(dto,req);}
  @UseGuards(SessionGuard) @Post('password') password(@Body()dto:PasswordDto,@Req()req:AuthRequest,@Res({passthrough:true})res:Response){return this.auth.password(dto,req,res);}
  @UseGuards(SessionGuard) @Post('email') email(@Body()dto:EmailChangeDto,@Req()req:AuthRequest){return this.auth.changeEmail(dto,req);}
  @UseGuards(SessionGuard) @Post('logout') async logout(@Req()req:AuthRequest,@Res({passthrough:true})res:Response){await this.db.session.update({where:{id:req.session!.id},data:{revokedAt:new Date()}});this.events.close(req.session!.id);cookie(res,'hh_session','',0);return {message:'Signed out.'};}
}
