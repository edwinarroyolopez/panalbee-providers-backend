import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Provider } from '../../providers/schemas/provider.schema';

export type IntakeLoteDocument = HydratedDocument<IntakeLote>;

export type IntakeLoteKind = 'productos' | 'proveedores';

@Schema({ timestamps: true })
export class IntakeLote {
  /** Obligatorio para `productos`; ausente en cargas de proveedores a nivel organización. */
  @Prop({ type: Types.ObjectId, ref: Provider.name, index: true, sparse: true })
  providerId?: Types.ObjectId;

  @Prop({ required: true, enum: ['productos', 'proveedores'] satisfies IntakeLoteKind[] })
  kind: IntakeLoteKind;

  @Prop({ trim: true })
  sourceLabel?: string;

  @Prop({ type: Object, required: true })
  summary: {
    total: number;
    valid: number;
    invalid: number;
    inserted: number;
    skipped?: number;
    importMode?: 'all_or_nothing' | 'insert_valid_only';
  };

  @Prop({ type: [Object], default: [] })
  validationErrors: Array<{
    index: number;
    field: string;
    message: string;
    code?: string;
    blocksRecord?: boolean;
  }>;

  @Prop({ required: true })
  actorUserId: string;

  @Prop()
  revokedAt?: Date;

  @Prop({ trim: true })
  revokedByUserId?: string;
}

export const IntakeLoteSchema = SchemaFactory.createForClass(IntakeLote);
