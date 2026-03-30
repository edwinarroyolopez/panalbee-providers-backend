import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProductDecisionType, ProductStatus } from '../products.types';

export class ChangeProductStateDto {
  @IsEnum(ProductStatus)
  nextStatus: ProductStatus;

  @IsEnum(ProductDecisionType)
  decisionType: ProductDecisionType;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  reasons: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
