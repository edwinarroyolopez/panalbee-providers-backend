import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../products.types';

const PAGE_SIZE = 24;

export { PAGE_SIZE };

export class ListProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
