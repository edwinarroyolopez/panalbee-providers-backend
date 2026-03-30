import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Provider, ProviderDocument } from '../providers/schemas/provider.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  ProductDecision,
  ProductDecisionDocument,
} from '../products/schemas/product-decision.schema';
import { ProductDecisionType, ProductStatus } from '../products/products.types';
import { CreateProductExportDto } from './dto/create-product-export.dto';
import { ProductExport, ProductExportDocument } from './schemas/product-export.schema';

@Injectable()
export class ExportsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(ProductExport.name)
    private readonly productExportModel: Model<ProductExportDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductDecision.name)
    private readonly productDecisionModel: Model<ProductDecisionDocument>,
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
  ) {}

  private normalizeText(input?: string): string {
    return (input ?? '').trim();
  }

  private normalizeKey(input?: string): string {
    return this.normalizeText(input).toLowerCase().replace(/\s+/g, '_');
  }

  private async assertProviderExists(providerId: string): Promise<Types.ObjectId> {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new NotFoundException('Proveedor no encontrado.');
    }
    const id = new Types.ObjectId(providerId);
    const exists = await this.providerModel.exists({ _id: id }).exec();
    if (!exists) {
      throw new NotFoundException('Proveedor no encontrado.');
    }
    return id;
  }

  private buildExportRows(products: ProductDocument[]) {
    return products.map((p) => {
      const o = p.toObject();
      return {
        id: String(o._id),
        name: o.name,
        category: o.category,
        categoryKey: o.categoryKey,
        productType: o.productType,
        price: o.price,
        compareAtPrice: o.compareAtPrice,
        currency: o.currency,
        sku: o.sku,
        externalId: o.externalId,
        mainImageUrl: o.mainImageUrl,
        imageUrls: o.imageUrls,
        description: o.description,
        intakeKey: o.intakeKey,
        status: ProductStatus.EXPORTADO,
        exportedAt: new Date().toISOString(),
      };
    });
  }

  private buildCsv(rows: ReturnType<ExportsService['buildExportRows']>): Buffer {
    const headers = [
      'id',
      'name',
      'category',
      'price',
      'currency',
      'sku',
      'externalId',
      'mainImageUrl',
      'status',
    ];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          esc(r.id),
          esc(r.name),
          esc(r.category ?? ''),
          esc(r.price),
          esc(r.currency),
          esc(r.sku ?? ''),
          esc(r.externalId ?? ''),
          esc(r.mainImageUrl ?? ''),
          esc(r.status),
        ].join(','),
      ),
    ];
    return Buffer.from('\uFEFF' + lines.join('\n'), 'utf-8');
  }

  async listExports(providerId: string) {
    const providerObjectId = await this.assertProviderExists(providerId);
    const items = await this.productExportModel
      .find({ providerId: providerObjectId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()
      .exec();

    return { items };
  }

  async runExport(
    providerId: string,
    dto: CreateProductExportDto,
    actorUserId: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    exportId: string;
    exportedCount: number;
  }> {
    const providerObjectId = await this.assertProviderExists(providerId);

    const unique = new Set(dto.productIds);
    if (unique.size !== dto.productIds.length) {
      throw new BadRequestException('La lista contiene IDs duplicados.');
    }

    const ids = dto.productIds.map((id) => new Types.ObjectId(id));
    const normalizedReasons = dto.reasons.map((r) => this.normalizeKey(r)).filter(Boolean);
    if (!normalizedReasons.length) {
      throw new BadRequestException('La exportacion requiere al menos un motivo estructurado.');
    }
    const normalizedComment = this.normalizeText(dto.comment) || undefined;

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const locked = await this.productModel
        .find({
          _id: { $in: ids },
          providerId: providerObjectId,
          status: ProductStatus.LISTO_PARA_EXPORTAR,
        })
        .session(session)
        .exec();

      if (locked.length !== dto.productIds.length) {
        throw new BadRequestException(
          'Solo se exportan productos en estado listo_para_exportar del proveedor indicado.',
        );
      }

      const byId = new Map(locked.map((p) => [p._id.toString(), p]));
      const ordered = dto.productIds.map((id) => {
        const p = byId.get(id);
        if (!p) {
          throw new BadRequestException('No se pudo resolver el orden de exportacion.');
        }
        return p;
      });

      const rows = this.buildExportRows(ordered);

      const [exportDoc] = await this.productExportModel.create(
        [
          {
            providerId: providerObjectId,
            format: dto.format,
            productIds: ids,
            productCount: ordered.length,
            reasons: normalizedReasons,
            comment: normalizedComment,
            actorUserId,
          },
        ],
        { session },
      );

      const exportRecordId = exportDoc._id.toString();
      const exportedAtIso = new Date().toISOString();

      const buffer =
        dto.format === 'csv'
          ? this.buildCsv(rows)
          : Buffer.from(
              JSON.stringify(
                {
                  meta: {
                    providerId,
                    exportRecordId,
                    exportedAt: exportedAtIso,
                    format: 'json',
                    productCount: rows.length,
                    reasons: normalizedReasons,
                    comment: normalizedComment ?? null,
                    actorUserId,
                  },
                  products: rows,
                },
                null,
                2,
              ),
              'utf-8',
            );

      const decidedAt = new Date();
      for (const p of ordered) {
        const previousStatus = p.status;
        p.status = ProductStatus.EXPORTADO;
        p.updatedByUserId = actorUserId;
        await p.save({ session });

        await this.productDecisionModel.create(
          [
            {
              productId: p._id,
              providerId: providerObjectId,
              decisionType: ProductDecisionType.EXPORTAR,
              previousStatus,
              nextStatus: ProductStatus.EXPORTADO,
              reasons: normalizedReasons,
              comment: normalizedComment,
              actorUserId,
              decidedAt,
            },
          ],
          { session },
        );
      }

      await session.commitTransaction();

      const ts = decidedAt.toISOString().replace(/[:.]/g, '-');
      const filename = `panalbee-airlock-${providerId.slice(-6)}-${ts}.${dto.format === 'json' ? 'json' : 'csv'}`;
      const mimeType =
        dto.format === 'json' ? 'application/json; charset=utf-8' : 'text/csv; charset=utf-8';

      return {
        buffer,
        filename,
        mimeType,
        exportId: exportRecordId,
        exportedCount: ordered.length,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
