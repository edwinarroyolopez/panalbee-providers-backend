import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountDocument = HydratedDocument<Account>;

/**
 * Single internal organization scope for the airlock (v1).
 * Persisted as `Account` for historical Mongo collection compatibility only — not commercial "account" semantics.
 */
@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  onboardingNotes?: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
