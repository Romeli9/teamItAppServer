import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MessageAttachmentDto {
  @IsIn(['image', 'file', 'voice'])
  type!: 'image' | 'file' | 'voice';

  @IsString()
  url!: string;

  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() size?: number;
  @IsOptional() @IsNumber() duration?: number;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}
