import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mainCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  phones?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(320)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  trustLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  internalNotes?: string;
}
