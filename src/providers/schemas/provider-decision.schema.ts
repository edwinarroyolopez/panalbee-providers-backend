import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Provider } from './provider.schema';
import { ProviderDecisionType, ProviderStatus } from '../providers.types';

export type ProviderDecisionDocument = HydratedDocument<ProviderDecision>;

@Schema({ timestamps: true })
export class ProviderDecision {
  @Prop({ type: Types.ObjectId, ref: Provider.name, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ enum: Object.values(ProviderDecisionType), required: true, index: true })
  decisionType: ProviderDecisionType;

  @Prop({ enum: Object.values(ProviderStatus), required: true })
  previousStatus: ProviderStatus;

  @Prop({ enum: Object.values(ProviderStatus), required: true })
  nextStatus: ProviderStatus;

  @Prop({ type: [String], required: true, default: [] })
  reasons: string[];

  @Prop({ trim: true })
  comment?: string;

  @Prop({ required: true, index: true })
  actorUserId: string;

  @Prop({ required: true, default: () => new Date(), index: true })
  decidedAt: Date;
}

export const ProviderDecisionSchema =
  SchemaFactory.createForClass(ProviderDecision);
