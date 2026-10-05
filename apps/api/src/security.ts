import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Request, Response } from 'express';
import { Session, User } from '@prisma/client';
import { Db } from './db';
import { settings } from './config';
export type AuthRequest=Request & {identity?:User;session?:Session};
export const digest=(value:string,secret=settings.sessionSecret)=>createHmac('sha256',secret).update(value).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export function same(a:string,b:string){return a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export const publicUser={id:true,firstName:true,lastName:true,avatarId:true} as const;
export function privateUser(u:User){return {id:u.id,firstName:u.firstName,lastName:u.lastName,email:u.email,phone:u.phone,avatarId:u.avatarId};}
export function cookie(res:Response,name:string,value:string,maxAge:number,httpOnly=true){res.cookie(name,value,{httpOnly,secure:settings.secure,sameSite:'lax',path:'/',maxAge});}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private db:Db){}
  async canActivate(ctx:ExecutionContext){
    const req=ctx.switchToHttp().getRequest<AuthRequest>();
    const raw=req.cookies?.hh_session;
    if(!raw)throw new UnauthorizedException('Sign in to continue.');
    const session=await this.db.session.findUnique({where:{tokenHash:digest(raw)},include:{user:true}});
    if(!session || session.revokedAt || session.expiresAt<=new Date() || !session.user.emailVerifiedAt)throw new UnauthorizedException('Your session expired. Sign in again.');
    req.identity=session.user; req.session=session; return true;
  }
}
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx:ExecutionContext){
    const req=ctx.switchToHttp().getRequest<Request>();
    if(['GET','HEAD','OPTIONS'].includes(req.method))return true;
    if(req.headers.origin!==settings.origin)throw new ForbiddenException('Request origin rejected.');
    const c=req.cookies?.hh_csrf, h=req.headers['x-csrf-token'];
    if(!c || typeof h!=='string' || !same(c,h))throw new ForbiddenException('Refresh the page before trying again.');
    const [nonce,signature]=c.split('.');
    if(!nonce || !signature || !same(signature,digest(`csrf:${nonce}`)))throw new ForbiddenException('Invalid CSRF token.');
    return true;
  }
}
