import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductExportDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  productIds: string[];

  @IsEnum(['json', 'csv'] as const)
  format: 'json' | 'csv';

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  reasons: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
