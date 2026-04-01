import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type ListProvidersSort =
  | 'products_first'
  | 'recent'
  | 'name_asc'
  | 'name_desc'
  | 'intel_growth_desc'
  | 'intel_growth_asc';

/** Filtro por recomendación parseada desde `internalNotes` (línea intel:). */
export type ListProvidersIntelRec =
  | 'all'
  | 'priorizar_para_panalbee'
  | 'priorizar_para_growth'
  | 'priorizar_para_ambos'
  | 'revisar_manual'
  | 'descartar'
  | 'sin_intel';

/** Oportunidad growth (score `go=` en notas). */
export type ListProvidersIntelGrowth = 'all' | 'alta' | 'media';

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
  @IsIn([
    'products_first',
    'recent',
    'name_asc',
    'name_desc',
    'intel_growth_desc',
    'intel_growth_asc',
  ])
  sort?: ListProvidersSort;

  @IsOptional()
  @IsIn([
    'all',
    'priorizar_para_panalbee',
    'priorizar_para_growth',
    'priorizar_para_ambos',
    'revisar_manual',
    'descartar',
    'sin_intel',
  ])
  intelRec?: ListProvidersIntelRec;

  @IsOptional()
  @IsIn(['all', 'alta', 'media'])
  intelGrowth?: ListProvidersIntelGrowth;

  /**
   * `pipeline`: hasta 400 proveedores que pasan filtros, ordenados por GO desc (fijo),
   * agrupados por recomendación en cliente/servidor. La lista clásica usa `list` (default).
   */
  @IsOptional()
  @IsIn(['list', 'pipeline'])
  view?: 'list' | 'pipeline';
}
