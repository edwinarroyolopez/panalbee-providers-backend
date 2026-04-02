import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Provider } from './provider.schema';
import { ProviderEventType } from '../providers.types';

export type ProviderEventDocument = HydratedDocument<ProviderEvent>;

@Schema({ timestamps: false })
export class ProviderEvent {
  @Prop({ type: Types.ObjectId, ref: Provider.name, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ enum: Object.values(ProviderEventType), required: true, index: true })
  eventType: ProviderEventType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  comment?: string;

  @Prop({ type: SchemaTypes.Mixed })
  meta?: Record<string, unknown>;

  @Prop({ required: true, index: true })
  actorUserId: string;

  @Prop({ required: true, default: () => new Date(), index: true })
  createdAt: Date;
}

export const ProviderEventSchema = SchemaFactory.createForClass(ProviderEvent);

ProviderEventSchema.index({ providerId: 1, createdAt: -1 });
