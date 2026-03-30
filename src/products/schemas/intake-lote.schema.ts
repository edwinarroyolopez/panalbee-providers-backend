import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Provider } from '../../providers/schemas/provider.schema';

export type IntakeLoteDocument = HydratedDocument<IntakeLote>;

export type IntakeLoteKind = 'productos';

@Schema({ timestamps: true })
export class IntakeLote {
  @Prop({ type: Types.ObjectId, ref: Provider.name, required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ required: true, enum: ['productos'] satisfies IntakeLoteKind[] })
  kind: IntakeLoteKind;

  @Prop({ trim: true })
  sourceLabel?: string;

  @Prop({ type: Object, required: true })
  summary: {
    total: number;
    valid: number;
    invalid: number;
    inserted: number;
  };

  @Prop({ type: [Object], default: [] })
  validationErrors: Array<{ index: number; field: string; message: string }>;

  @Prop({ required: true })
  actorUserId: string;
}

export const IntakeLoteSchema = SchemaFactory.createForClass(IntakeLote);
