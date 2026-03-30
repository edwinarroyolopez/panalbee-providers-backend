import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProviderStatus } from '../providers.types';

export type ProviderDocument = HydratedDocument<Provider>;

@Schema({ timestamps: true })
export class Provider {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  mainCategory: string;

  @Prop({ required: true, trim: true, index: true })
  mainCategoryKey: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ type: [String], default: [] })
  phones: string[];

  @Prop({ trim: true })
  instagram?: string;

  @Prop({ trim: true })
  facebook?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ min: 0, max: 100 })
  trustLevel?: number;

  @Prop({
    enum: Object.values(ProviderStatus),
    default: ProviderStatus.INGRESADO,
    index: true,
  })
  status: ProviderStatus;

  @Prop({ trim: true })
  internalNotes?: string;

  @Prop({ required: true, trim: true, index: true, unique: true })
  intakeKey: string;

  @Prop({ required: true })
  createdByUserId: string;

  @Prop()
  updatedByUserId?: string;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);
