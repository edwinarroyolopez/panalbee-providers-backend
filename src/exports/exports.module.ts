import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Provider, ProviderSchema } from '../providers/schemas/provider.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  ProductDecision,
  ProductDecisionSchema,
} from '../products/schemas/product-decision.schema';
import { ProductExport, ProductExportSchema } from './schemas/product-export.schema';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductExport.name, schema: ProductExportSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductDecision.name, schema: ProductDecisionSchema },
      { name: Provider.name, schema: ProviderSchema },
    ]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsModule {}
