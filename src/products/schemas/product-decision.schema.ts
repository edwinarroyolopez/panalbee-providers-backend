import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Provider } from '../../providers/schemas/provider.schema';
import { Product } from './product.schema';
import { ProductDecisionType, ProductStatus } from '../products.types';

export type ProductDecisionDocument = HydratedDocument<ProductDecision>;

@Schema({ timestamps: true })
export class ProductDecision {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Provider.name, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ enum: Object.values(ProductDecisionType), required: true, index: true })
  decisionType: ProductDecisionType;

  @Prop({ enum: Object.values(ProductStatus), required: true })
  previousStatus: ProductStatus;

  @Prop({ enum: Object.values(ProductStatus), required: true })
  nextStatus: ProductStatus;

  @Prop({ type: [String], required: true, default: [] })
  reasons: string[];

  @Prop({ trim: true })
  comment?: string;

  @Prop({ required: true, index: true })
  actorUserId: string;

  @Prop({ required: true, default: () => new Date(), index: true })
  decidedAt: Date;
}

export const ProductDecisionSchema =
  SchemaFactory.createForClass(ProductDecision);
