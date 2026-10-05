import { BadRequestException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { Db } from './db';
import { AuthRequest, SessionGuard } from './security';
import { FileQuery } from './dto';
import { settings } from './config';
@Controller('files')
export class MediaController {
  constructor(private db:Db){}
  @Post() @UseGuards(SessionGuard) @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1},storage:undefined}))
  async upload(@UploadedFile()file:Express.Multer.File,@Query()q:FileQuery,@Req()r:AuthRequest){
    if(!file?.buffer)throw new BadRequestException('Choose a JPEG, PNG or WebP image up to 5 MiB.');
    let bytes:Buffer;
    try{const image=sharp(file.buffer,{limitInputPixels:25000000,failOn:'warning'}),meta=await image.metadata();if(!['jpeg','png','webp'].includes(meta.format||'') || (meta.pages||1)>1)throw new Error('format');bytes=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();}
    catch{throw new BadRequestException('Invalid image. Only static JPEG, PNG and WebP are allowed.');}
    const filename=`${randomUUID()}.webp`;await mkdir(settings.uploads,{recursive:true});await writeFile(join(settings.uploads,filename),bytes,{flag:'wx'});
    try{const result=await this.db.uploadedFile.create({data:{ownerId:r.identity!.id,filename,mime:'image/webp',size:bytes.length,use:q.use}});return {id:result.id,url:`/api/v1/files/${result.id}`};}catch(e){await unlink(join(settings.uploads,filename));throw e;}
  }
  @Get(':id') async download(@Param('id',ParseUUIDPipe)id:string,@Req()r:AuthRequest,@Res()res:Response){
    const file=await this.db.uploadedFile.findUnique({where:{id},include:{tasks:{select:{id:true}},avatars:{select:{id:true}}}});
    if(!file)throw new NotFoundException('Image unavailable.');
    // Attached sanitized task images and avatars are intentionally public. Unattached files require ownership.
    if(!file.tasks.length && !file.avatars.length){await new SessionGuard(this.db).canActivate({switchToHttp:()=>({getRequest:()=>r})} as any);if(file.ownerId!==r.identity!.id)throw new NotFoundException('Image unavailable.');}
    res.setHeader('Content-Type','image/webp');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, max-age=300');res.sendFile(join(settings.uploads,file.filename),{dotfiles:'allow'});
  }
}
