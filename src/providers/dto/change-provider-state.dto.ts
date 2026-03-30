import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProviderDecisionType, ProviderStatus } from '../providers.types';

export class ChangeProviderStateDto {
  @IsEnum(ProviderStatus)
  nextStatus: ProviderStatus;

  @IsEnum(ProviderDecisionType)
  decisionType: ProviderDecisionType;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  reasons: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
