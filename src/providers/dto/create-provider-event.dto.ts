import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProviderEventType } from '../providers.types';

export class CreateProviderEventDto {
  @IsEnum(ProviderEventType)
  eventType: ProviderEventType;

  @IsString()
  @MaxLength(140)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  comment?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
