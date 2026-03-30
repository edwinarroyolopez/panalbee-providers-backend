import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Provider, ProviderSchema } from '../providers/schemas/provider.schema';
import { ProvidersModule } from '../providers/providers.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';
import {
  ProductDecision,
  ProductDecisionSchema,
} from './schemas/product-decision.schema';
import { IntakeLote, IntakeLoteSchema } from './schemas/intake-lote.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductDecision.name, schema: ProductDecisionSchema },
      { name: IntakeLote.name, schema: IntakeLoteSchema },
      { name: Provider.name, schema: ProviderSchema },
    ]),
    ProvidersModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
