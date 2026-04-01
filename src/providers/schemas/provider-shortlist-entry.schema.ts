import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Account } from 'src/accounts/schemas/account.schema';
import { Provider } from './provider.schema';

export type ProviderShortlistEntryDocument = HydratedDocument<ProviderShortlistEntry>;

/**
 * Shortlist comercial por organización (account): foco operativo, no CRM ni estados de venta.
 * La intelligence sigue viviendo en Provider.internalNotes; aquí solo nota breve opcional.
 */
@Schema({ timestamps: true })
export class ProviderShortlistEntry {
  @Prop({ type: Types.ObjectId, ref: Account.name, required: true, index: true })
  accountId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Provider.name, required: true })
  providerId: Types.ObjectId;

  @Prop({ trim: true, maxlength: 320 })
  note?: string;

  @Prop({ required: true })
  createdByUserId: string;

  @Prop()
  updatedByUserId?: string;
}

export const ProviderShortlistEntrySchema =
  SchemaFactory.createForClass(ProviderShortlistEntry);

ProviderShortlistEntrySchema.index({ accountId: 1, providerId: 1 }, { unique: true });
