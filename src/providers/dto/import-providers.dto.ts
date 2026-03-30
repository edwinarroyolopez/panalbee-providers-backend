import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProviderImportItemDto {
  @IsString()
  @MaxLength(180)
  name: string;

  @IsString()
  @MaxLength(120)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsString()
  @MaxLength(120)
  country: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phones?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  trustLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;
}

export class ImportProvidersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProviderImportItemDto)
  providers: ProviderImportItemDto[];
}

export type ImportProviderItem = ProviderImportItemDto;
