import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { Provider, ProviderSchema } from './schemas/provider.schema';
import {
  ProviderDecision,
  ProviderDecisionSchema,
} from './schemas/provider-decision.schema';
import { IntakeLote, IntakeLoteSchema } from '../products/schemas/intake-lote.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Provider.name, schema: ProviderSchema },
      { name: ProviderDecision.name, schema: ProviderDecisionSchema },
      { name: IntakeLote.name, schema: IntakeLoteSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
