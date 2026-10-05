import { Transform, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { FileUse } from '@prisma/client';
export class Credentials {
  @Transform(({value})=>typeof value==='string'?value.trim().toLowerCase():value) @IsEmail() @Length(3,254) email!:string;
  @IsString() @Length(12,128) password!:string;
}
export class Registration extends Credentials {
  @IsString() @Length(1,60) firstName!:string;
  @IsString() @Length(1,60) lastName!:string;
  @IsString() passwordConfirmation!:string;
  @IsOptional() @IsString() @Length(0,30) phone?:string;
}
export class EmailDto { @Transform(({value})=>typeof value==='string'?value.trim().toLowerCase():value) @IsEmail() @Length(3,254) email!:string; }
export class VerifyDto { @IsUUID() challengeId!:string; @Matches(/^\d{6}$/) code!:string; }
export class ChallengeDto { @IsUUID() challengeId!:string; }
export class ResetDto { @IsString() @Length(32,128) authorization!:string; @IsString() @Length(12,128) password!:string; }
export class PasswordDto { @IsString() @Length(1,128) currentPassword!:string; @IsString() @Length(12,128) password!:string; }
export class EmailChangeDto extends EmailDto { @IsString() @Length(1,128) currentPassword!:string; }
export class ProfileDto { @IsString() @Length(1,60) firstName!:string; @IsString() @Length(1,60) lastName!:string; @IsOptional() @IsString() @Length(0,30) phone?:string; @IsOptional() @IsUUID() avatarId?:string; }
export class TaskDto {
  @IsString() @Length(3,100) title!:string;
  @IsString() @Length(10,3000) description!:string;
  @IsString() @Length(2,160) location!:string;
  @IsISO8601({strict:true}) startAt!:string;
  @IsOptional() @IsISO8601({strict:true}) endAt?:string;
  @IsOptional() @IsUUID() imageId?:string;
}
export class RequestDto { @IsOptional() @IsString() @Length(0,1000) message?:string; }
export class ReasonDto { @IsString() @Length(3,1000) reason!:string; }
export class PageDto {
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(10000) page:number=1;
  @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(50) limit:number=12;
  @IsOptional() @IsString() @Length(0,100) search?:string;
  @IsOptional() @IsString() @Length(0,160) location?:string;
  @IsOptional() @IsEnum({soonest:'soonest',newest:'newest'}) sort:'soonest'|'newest'='soonest';
}
export class FileQuery { @IsEnum(FileUse) use!:FileUse; }
