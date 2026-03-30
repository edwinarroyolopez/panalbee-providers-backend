import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { ImportProductsDto } from './dto/import-products.dto';
import { ListProductsQueryDto } from './dto/list-products.dto';
import { ChangeProductStateDto } from './dto/change-product-state.dto';

@UseGuards(JwtAuthGuard)
@Controller('providers/:providerId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('import/validate')
  validateImport(
    @Param('providerId') providerId: string,
    @Body() dto: ImportProductsDto,
  ) {
    return this.productsService.validateImport(providerId, dto);
  }

  @Post('import')
  importProducts(
    @Param('providerId') providerId: string,
    @Body() dto: ImportProductsDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.productsService.importProducts(providerId, dto, req.user.sub);
  }

  @Get()
  list(
    @Param('providerId') providerId: string,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.productsService.listProducts(providerId, query);
  }

  @Get('intake-lotes')
  listIntakeLotes(@Param('providerId') providerId: string) {
    return this.productsService.listIntakeLotes(providerId);
  }

  @Get(':productId')
  getById(
    @Param('providerId') providerId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.getProductById(providerId, productId);
  }

  @Patch(':productId/state')
  changeState(
    @Param('providerId') providerId: string,
    @Param('productId') productId: string,
    @Body() dto: ChangeProductStateDto,
    @Req() req: { user: { sub: string } },
  ) {
    return this.productsService.changeProductStatus(
      providerId,
      productId,
      dto,
      req.user.sub,
    );
  }
}
