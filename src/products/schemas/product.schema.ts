import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Provider } from '../../providers/schemas/provider.schema';
import { IntakeLote } from './intake-lote.schema';
import { ProductStatus } from '../products.types';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: Types.ObjectId, ref: Provider.name, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: IntakeLote.name, required: true, index: true })
  intakeLoteId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ required: true, trim: true, index: true })
  categoryKey: string;

  @Prop({ trim: true })
  productType?: string;

  @Prop({ trim: true })
  mainImageUrl?: string;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ required: true })
  price: number;

  @Prop()
  compareAtPrice?: number;

  @Prop({ required: true, trim: true, default: 'PEN' })
  currency: string;

  @Prop({ trim: true })
  externalId?: string;

  @Prop({ trim: true })
  sku?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, trim: true, index: true })
  intakeKey: string;

  @Prop({
    enum: Object.values(ProductStatus),
    default: ProductStatus.CARGADO,
    index: true,
  })
  status: ProductStatus;

  @Prop({ required: true })
  createdByUserId: string;

  @Prop()
  updatedByUserId?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ providerId: 1, intakeKey: 1 }, { unique: true });
