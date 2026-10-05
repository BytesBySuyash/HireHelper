import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { Db } from './db';
import { AuthRequest, SessionGuard } from './security';
import { PageDto } from './dto';
import { Events } from './events';
@Controller('notifications') @UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private db:Db,private events:Events){}
  @Get() async list(@Req()r:AuthRequest,@Query()q:PageDto){const where={recipientId:r.identity!.id};const [items,total,unread]=await this.db.$transaction([this.db.notification.findMany({where,orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.db.notification.count({where}),this.db.notification.count({where:{...where,readAt:null}})]);return {items,total,unread,page:q.page,limit:q.limit};}
  @Get('unread') async unread(@Req()r:AuthRequest){return {unread:await this.db.notification.count({where:{recipientId:r.identity!.id,readAt:null}})};}
  @Post('read-all') async all(@Req()r:AuthRequest){await this.db.notification.updateMany({where:{recipientId:r.identity!.id,readAt:null},data:{readAt:new Date()}});this.events.publish(r.identity!.id,{refresh:true});return {message:'Notifications marked read.'};}
  @Post(':id/read') async read(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){await this.db.notification.updateMany({where:{id,recipientId:r.identity!.id,readAt:null},data:{readAt:new Date()}});this.events.publish(r.identity!.id,{refresh:true});return {message:'Notification marked read.'};}
  @Sse('events') stream(@Req()r:AuthRequest){return this.events.stream(r.identity!.id,r.session!.id,async()=>!!await this.db.session.findFirst({where:{id:r.session!.id,revokedAt:null,expiresAt:{gt:new Date()}}}));}
}
