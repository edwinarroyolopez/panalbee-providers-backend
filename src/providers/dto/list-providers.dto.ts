import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type ListProvidersSort =
  | 'products_first'
  | 'recent'
  | 'name_asc'
  | 'name_desc';

export class ListProvidersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Búsqueda práctica por nombre (coincidencia parcial, sin distinguir mayúsculas). */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  /** `true` | `false` desde query string. */
  @IsOptional()
  @IsIn(['true', 'false'])
  hasWebsite?: 'true' | 'false';

  @IsOptional()
  @IsIn(['true', 'false'])
  hasProducts?: 'true' | 'false';

  @IsOptional()
  @IsIn(['products_first', 'recent', 'name_asc', 'name_desc'])
  sort?: ListProvidersSort;
}
