import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { FileUse } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class Credentials {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @Length(3, 254)
  @ApiProperty({ format: 'email' })
  email!: string;
  @ApiProperty({ minLength: 12, maxLength: 128 }) @IsString() @Length(12, 128) password!: string;
}
export class Registration extends Credentials {
  @ApiProperty() @IsString() @Length(1, 60) @Matches(/\S/) firstName!: string;
  @ApiProperty() @IsString() @Length(1, 60) @Matches(/\S/) lastName!: string;
  @ApiProperty() @IsString() @Length(12, 128) passwordConfirmation!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 30) phone?: string;
}
export class EmailDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @Length(3, 254)
  @ApiProperty({ format: 'email' })
  email!: string;
}
export class VerifyDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() challengeId!: string;
  @ApiProperty({ pattern: '^\\d{6}$' }) @Matches(/^\d{6}$/) code!: string;
}
export class ChallengeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() challengeId!: string;
}
export class ResetDto {
  @ApiProperty() @IsString() @Length(32, 128) authorization!: string;
  @ApiProperty() @IsString() @Length(12, 128) password!: string;
}
export class PasswordDto {
  @ApiProperty() @IsString() @Length(1, 128) currentPassword!: string;
  @ApiProperty() @IsString() @Length(12, 128) password!: string;
}
export class EmailChangeDto extends EmailDto {
  @ApiProperty() @IsString() @Length(1, 128) currentPassword!: string;
}
export class ProfileDto {
  @ApiProperty() @IsString() @Length(1, 60) @Matches(/\S/) firstName!: string;
  @ApiProperty() @IsString() @Length(1, 60) @Matches(/\S/) lastName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 30) phone?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() avatarId?: string;
}
export class TaskDto {
  @ApiProperty() @IsString() @Length(3, 100) @Matches(/\S/) title!: string;
  @ApiProperty() @IsString() @Length(10, 3000) @Matches(/\S/) description!: string;
  @ApiProperty() @IsString() @Length(2, 160) @Matches(/\S/) location!: string;
  @ApiProperty({ format: 'date-time' }) @IsISO8601({ strict: true }) startAt!: string;
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  endAt?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() imageId?: string;
}
export class RequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 1000) message?: string;
}
export class ReasonDto {
  @ApiProperty() @IsString() @Length(3, 1000) reason!: string;
}
export class PageDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page: number = 1;
  @ApiPropertyOptional({ default: 12, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 160) location?: string;
  @ApiPropertyOptional({ enum: ['soonest', 'newest'] })
  @IsOptional()
  @IsEnum({ soonest: 'soonest', newest: 'newest' })
  sort: 'soonest' | 'newest' = 'soonest';
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  assigned?: string;
}
export class FileQuery {
  @ApiProperty({ enum: FileUse }) @IsEnum(FileUse) use!: FileUse;
}
