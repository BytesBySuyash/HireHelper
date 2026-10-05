import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma, TaskStatus } from '@prisma/client';
import { Db } from './db';
import { AuthRequest, publicUser, SessionGuard } from './security';
import { PageDto, ReasonDto, RequestDto, TaskDto } from './dto';
import { Events } from './events';
const include={owner:{select:publicUser},assignment:{include:{helper:{select:publicUser}}}} as const;
type Tx=Prisma.TransactionClient;
@Injectable()
export class Tasks {
  constructor(private db:Db,private events:Events){}
  async transaction<T>(fn:(tx:Tx)=>Promise<T>):Promise<T>{
    for(let attempt=0;attempt<3;attempt++){
      // Task row locks serialize all mutations. READ COMMITTED lets a competing lock
      // see the committed task state and return a domain 409 rather than a raw SQL error.
      try{return await this.db.$transaction(fn,{isolationLevel:'ReadCommitted'});}
      catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError){if(e.code==='P2034' && attempt<2)continue;if(['P2002','P2034'].includes(e.code))throw new ConflictException('This action conflicts with the current state. Refresh and try again.');}throw e;}
    }throw new ConflictException('Please retry.');
  }
  async notify(tx:Tx,recipientId:string,body:string,taskId:string,requestId?:string){await tx.notification.create({data:{recipientId,type:'TASK_EVENT',body,taskId,requestId}});}
  async publish(taskId:string){
    const notifications=await this.db.notification.findMany({where:{taskId,createdAt:{gte:new Date(Date.now()-10000)}},select:{recipientId:true},distinct:['recipientId']});
    for(const n of notifications)this.events.publish(n.recipientId,{taskId,refresh:true});
  }
  async locked(tx:Tx,id:string){await tx.$queryRaw`SELECT "id" FROM "Task" WHERE "id"=${id}::uuid FOR UPDATE`;const task=await tx.task.findUnique({where:{id},include:{assignment:true,_count:{select:{requests:true}}}});if(!task)throw new NotFoundException('Task unavailable.');return task;}
  async image(tx:Tx,imageId:string|undefined,ownerId:string){if(imageId){await tx.$queryRaw`SELECT "id" FROM "UploadedFile" WHERE "id"=${imageId}::uuid FOR UPDATE`;if(!await tx.uploadedFile.findFirst({where:{id:imageId,ownerId,use:'TASK'}}))throw new BadRequestException('Image unavailable.');}}
  schedule(dto:TaskDto){const startAt=new Date(dto.startAt),endAt=dto.endAt?new Date(dto.endAt):null;if(!/[zZ]|[+-]\d{2}:\d{2}$/.test(dto.startAt) || startAt<=new Date() || (endAt && endAt<=startAt))throw new BadRequestException('Use a future start time with timezone and an end time after start.');return {startAt,endAt};}
  async feed(userId:string,q:PageDto){
    const where:Prisma.TaskWhereInput={status:'OPEN',startAt:{gt:new Date()},ownerId:{not:userId},...(q.search?{OR:[{title:{contains:q.search,mode:'insensitive'}},{description:{contains:q.search,mode:'insensitive'}}]}:{}),...(q.location?{location:{contains:q.location,mode:'insensitive'}}:{})};
    const [items,total]=await this.db.$transaction([this.db.task.findMany({where,include,skip:(q.page-1)*q.limit,take:q.limit,orderBy:q.sort==='newest'?{createdAt:'desc'}:{startAt:'asc'}}),this.db.task.count({where})]);return {items,total,page:q.page,limit:q.limit};
  }
  async mine(userId:string,q:PageDto){const where={ownerId:userId};const [items,total]=await this.db.$transaction([this.db.task.findMany({where,include,orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.db.task.count({where})]);return {items,total,page:q.page,limit:q.limit};}
  async detail(id:string,userId:string){
    const task=await this.db.task.findUnique({where:{id},include});
    if(!task)throw new NotFoundException('Task unavailable.');
    const participant=task.ownerId===userId || task.assignment?.helperId===userId || !!await this.db.taskRequest.findUnique({where:{taskId_requesterId:{taskId:id,requesterId:userId}}});
    if(!participant && (task.status!=='OPEN' || task.startAt<=new Date()))throw new NotFoundException('Task unavailable.');
    let contacts:unknown=null;
    if(task.assignment && [task.ownerId,task.assignment.helperId].includes(userId))contacts=await this.db.user.findMany({where:{id:{in:[task.ownerId,task.assignment.helperId]}},select:{...publicUser,email:true,phone:true}});
    const myRequest=await this.db.taskRequest.findUnique({where:{taskId_requesterId:{taskId:id,requesterId:userId}}});
    return {...task,contacts,myRequest};
  }
  async create(dto:TaskDto,userId:string){const schedule=this.schedule(dto);return this.transaction(async tx=>{await this.image(tx,dto.imageId,userId);return tx.task.create({data:{...dto,...schedule,ownerId:userId},include});});}
  async edit(id:string,dto:TaskDto,userId:string){const schedule=this.schedule(dto);return this.transaction(async tx=>{const task=await this.locked(tx,id);if(task.ownerId!==userId)throw new ForbiddenException('Only the owner can edit.');if(task.status!=='OPEN' || task._count.requests>0)throw new ConflictException('Only open tasks without requests can be edited.');await this.image(tx,dto.imageId,userId);return tx.task.update({where:{id},data:{...dto,...schedule},include});});}
  async remove(id:string,userId:string){return this.transaction(async tx=>{const task=await this.locked(tx,id);if(task.ownerId!==userId)throw new ForbiddenException('Only the owner can delete.');if(task.status!=='OPEN' || task._count.requests>0)throw new ConflictException('Only open tasks without requests can be deleted.');await tx.task.delete({where:{id}});return {message:'Task deleted.'};});}
  async request(id:string,dto:RequestDto,userId:string){
    const result=await this.transaction(async tx=>{const task=await this.locked(tx,id);if(task.ownerId===userId)throw new ForbiddenException('You cannot request your own task.');if(task.status!=='OPEN' || task.startAt<=new Date())throw new ConflictException('This task is closed or expired.');const request=await tx.taskRequest.create({data:{taskId:id,requesterId:userId,message:dto.message}});await this.notify(tx,task.ownerId,`New help request for ${task.title}`,id,request.id);return request;});await this.publish(id);return result;
  }
  async requests(userId:string,received:boolean,q:PageDto){const where:Prisma.TaskRequestWhereInput=received?{task:{ownerId:userId}}:{requesterId:userId};const [items,total]=await this.db.$transaction([this.db.taskRequest.findMany({where,include:{task:{include},requester:{select:publicUser}},orderBy:{createdAt:'desc'},skip:(q.page-1)*q.limit,take:q.limit}),this.db.taskRequest.count({where})]);return {items,total,page:q.page,limit:q.limit};}
  async action(id:string,action:'accept'|'reject'|'withdraw',userId:string){
    const initial=await this.db.taskRequest.findUnique({where:{id},select:{taskId:true}});if(!initial)throw new NotFoundException('Request unavailable.');
    const result=await this.transaction(async tx=>{
      const task=await this.locked(tx,initial.taskId), request=await tx.taskRequest.findUniqueOrThrow({where:{id}});
      if(action==='withdraw'?request.requesterId!==userId:task.ownerId!==userId)throw new ForbiddenException('You cannot change this request.');
      if(request.status!=='PENDING')throw new ConflictException('Request is no longer pending.');
      if(action==='accept'){
        if(task.status!=='OPEN' || task.startAt<=new Date())throw new ConflictException('Task is closed or expired.');
        await tx.task.update({where:{id:task.id},data:{status:'ASSIGNED'}});
        await tx.taskAssignment.create({data:{taskId:task.id,helperId:request.requesterId,acceptedRequestId:request.id}});
        const others=await tx.taskRequest.findMany({where:{taskId:task.id,status:'PENDING',id:{not:id}}});
        await tx.taskRequest.updateMany({where:{taskId:task.id,status:'PENDING',id:{not:id}},data:{status:'REJECTED'}});
        for(const r of others)await this.notify(tx,r.requesterId,`Another helper was selected for ${task.title}`,task.id,r.id);
      }
      const updated=await tx.taskRequest.update({where:{id},data:{status:action==='accept'?'ACCEPTED':action==='reject'?'REJECTED':'WITHDRAWN'}});
      await this.notify(tx,action==='withdraw'?task.ownerId:request.requesterId,`${task.title}: request ${action==='accept'?'accepted':action==='reject'?'rejected':'withdrawn'}`,task.id,id);return updated;
    });await this.publish(initial.taskId);return result;
  }
  async transition(id:string,action:string,userId:string,reason?:string){
    const result=await this.transaction(async tx=>{
      const task=await this.locked(tx,id),owner=task.ownerId===userId,helper=task.assignment?.helperId===userId;
      if(action==='cancel'? !owner : ['start','complete-request'].includes(action)? !helper : !owner)throw new ForbiddenException('You cannot perform this action.');
      let status:TaskStatus;
      if(action==='cancel' && ['OPEN','ASSIGNED'].includes(task.status))status='CANCELLED';
      else if(action==='start' && task.status==='ASSIGNED')status='IN_PROGRESS';
      else if(action==='complete-request' && task.status==='IN_PROGRESS')status='COMPLETION_PENDING';
      else if(action==='confirm' && task.status==='COMPLETION_PENDING')status='COMPLETED';
      else if(action==='return' && task.status==='COMPLETION_PENDING' && reason)status='IN_PROGRESS';
      else throw new ConflictException('Invalid transition. Cancellation is allowed only before work begins.');
      await tx.task.update({where:{id},data:{status}});
      if(task.assignment)await tx.taskAssignment.update({where:{taskId:id},data:{...(action==='start'?{startedAt:new Date()}:{}),...(action==='complete-request'?{completionRequestedAt:new Date()}:{}),...(action==='return'?{returnReason:reason,completionRequestedAt:null}:{}),...(status==='COMPLETED'?{status:'COMPLETED',completedAt:new Date()}:{}),...(status==='CANCELLED'?{status:'CANCELLED',cancelledAt:new Date()}: {})}});
      if(status==='CANCELLED'){
        const pending=await tx.taskRequest.findMany({where:{taskId:id,status:'PENDING'}});await tx.taskRequest.updateMany({where:{taskId:id,status:'PENDING'},data:{status:'REJECTED'}});
        for(const r of pending)await this.notify(tx,r.requesterId,`${task.title} was cancelled.`,id,r.id);
      }
      if(task.assignment)await this.notify(tx,owner?task.assignment.helperId:task.ownerId,`${task.title}: ${status.toLowerCase().replaceAll('_',' ')}${reason?`. ${reason}`:''}`,id);
      return tx.task.findUnique({where:{id},include});
    });await this.publish(id);return result;
  }
  async counts(userId:string){const [open,owned,received,assigned]=await this.db.$transaction([this.db.task.count({where:{ownerId:{not:userId},status:'OPEN',startAt:{gt:new Date()}}}),this.db.task.count({where:{ownerId:userId,status:{notIn:['COMPLETED','CANCELLED']}}}),this.db.taskRequest.count({where:{task:{ownerId:userId},status:'PENDING'}}),this.db.taskAssignment.count({where:{helperId:userId,status:'ACTIVE'}})]);return {open,owned,received,assigned};}
}
@ApiTags('Tasks and requests') @UseGuards(SessionGuard) @Controller()
export class TasksController {
  constructor(private tasks:Tasks){}
  @Get('dashboard') counts(@Req()r:AuthRequest){return this.tasks.counts(r.identity!.id);}
  @Get('tasks') feed(@Req()r:AuthRequest,@Query()q:PageDto){return this.tasks.feed(r.identity!.id,q);}
  @Get('tasks/mine') mine(@Req()r:AuthRequest,@Query()q:PageDto){return this.tasks.mine(r.identity!.id,q);}
  @Get('tasks/:id') detail(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.detail(id,r.identity!.id);}
  @Post('tasks') create(@Body()dto:TaskDto,@Req()r:AuthRequest){return this.tasks.create(dto,r.identity!.id);}
  @Patch('tasks/:id') edit(@Param('id',ParseUUIDPipe)id:string,@Body()dto:TaskDto,@Req()r:AuthRequest){return this.tasks.edit(id,dto,r.identity!.id);}
  @Delete('tasks/:id') remove(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.remove(id,r.identity!.id);}
  @Post('tasks/:id/requests') request(@Param('id',ParseUUIDPipe)id:string,@Body()dto:RequestDto,@Req()r:AuthRequest){return this.tasks.request(id,dto,r.identity!.id);}
  @Get('requests/received') received(@Req()r:AuthRequest,@Query()q:PageDto){return this.tasks.requests(r.identity!.id,true,q);}
  @Get('requests/sent') sent(@Req()r:AuthRequest,@Query()q:PageDto){return this.tasks.requests(r.identity!.id,false,q);}
  @Post('requests/:id/accept') accept(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.action(id,'accept',r.identity!.id);}
  @Post('requests/:id/reject') reject(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.action(id,'reject',r.identity!.id);}
  @Post('requests/:id/withdraw') withdraw(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.action(id,'withdraw',r.identity!.id);}
  @Post('tasks/:id/cancel') cancel(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.transition(id,'cancel',r.identity!.id);}
  @Post('tasks/:id/start') start(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.transition(id,'start',r.identity!.id);}
  @Post('tasks/:id/complete-request') complete(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.transition(id,'complete-request',r.identity!.id);}
  @Post('tasks/:id/confirm') confirm(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest){return this.tasks.transition(id,'confirm',r.identity!.id);}
  @Post('tasks/:id/return') back(@Param('id',ParseUUIDPipe)id:string,@Body()dto:ReasonDto,@Req()r:AuthRequest){return this.tasks.transition(id,'return',r.identity!.id,dto.reason);}
}
