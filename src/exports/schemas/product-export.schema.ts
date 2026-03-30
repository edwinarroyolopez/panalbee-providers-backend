import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Provider } from '../../providers/schemas/provider.schema';
import { Product } from '../../products/schemas/product.schema';

export type ProductExportDocument = HydratedDocument<ProductExport>;

export type ProductExportFormat = 'json' | 'csv';

@Schema({ timestamps: true })
export class ProductExport {
  @Prop({ type: Types.ObjectId, ref: Provider.name, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ required: true, enum: ['json', 'csv'] })
  format: ProductExportFormat;

  @Prop({ type: [{ type: Types.ObjectId, ref: Product.name }], required: true })
  productIds: Types.ObjectId[];

  @Prop({ required: true })
  productCount: number;

  @Prop({ type: [String], required: true })
  reasons: string[];

  @Prop({ trim: true })
  comment?: string;

  @Prop({ required: true, index: true })
  actorUserId: string;
}

export const ProductExportSchema = SchemaFactory.createForClass(ProductExport);
