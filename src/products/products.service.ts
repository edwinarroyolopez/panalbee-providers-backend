import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Provider, ProviderDocument } from '../providers/schemas/provider.schema';
import { ProvidersService } from '../providers/providers.service';
import { ImportProductItem, ImportProductsDto } from './dto/import-products.dto';
import { ChangeProductStateDto } from './dto/change-product-state.dto';
import { ListProductsQueryDto, PAGE_SIZE } from './dto/list-products.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import {
  ProductDecision,
  ProductDecisionDocument,
} from './schemas/product-decision.schema';
import { IntakeLote, IntakeLoteDocument } from './schemas/intake-lote.schema';
import { ProductDecisionType, ProductStatus } from './products.types';

type ImportValidationError = {
  index: number;
  field: string;
  message: string;
};

type NormalizedProductInput = {
  name: string;
  category?: string;
  categoryKey: string;
  productType?: string;
  mainImageUrl?: string;
  imageUrls: string[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  externalId?: string;
  sku?: string;
  description?: string;
  intakeKey: string;
};

const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.CARGADO]: [
    ProductStatus.PRIORIZADO,
    ProductStatus.DESCARTADO,
    ProductStatus.APROBADO,
  ],
  [ProductStatus.PRIORIZADO]: [ProductStatus.DESCARTADO, ProductStatus.APROBADO],
  [ProductStatus.DESCARTADO]: [ProductStatus.CARGADO],
  [ProductStatus.APROBADO]: [
    ProductStatus.DESCARTADO,
    ProductStatus.LISTO_PARA_EXPORTAR,
  ],
  [ProductStatus.LISTO_PARA_EXPORTAR]: [],
  [ProductStatus.EXPORTADO]: [],
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductDecision.name)
    private readonly productDecisionModel: Model<ProductDecisionDocument>,
    @InjectModel(IntakeLote.name)
    private readonly intakeLoteModel: Model<IntakeLoteDocument>,
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
    private readonly providersService: ProvidersService,
  ) {}

  private normalizeText(input?: string): string {
    return (input ?? '').trim();
  }

  private normalizeKey(input?: string): string {
    return this.normalizeText(input).toLowerCase().replace(/\s+/g, '_');
  }

  private normalizeCurrency(input?: string): string {
    const c = this.normalizeText(input).toUpperCase();
    return c || 'PEN';
  }

  private buildIntakeKey(item: ImportProductItem): string {
    const ext = this.normalizeKey(item.externalId);
    if (ext) return `ext:${ext}`;
    const sku = this.normalizeKey(item.sku);
    if (sku) return `sku:${sku}`;
    const nameKey = this.normalizeKey(item.name);
    const priceKey = String(Math.round(item.price * 100) / 100);
    return `name:${nameKey}|price:${priceKey}`;
  }

  private normalizeImportItem(item: ImportProductItem): NormalizedProductInput {
    const category = this.normalizeText(item.category) || undefined;
    return {
      name: this.normalizeText(item.name),
      category,
      categoryKey: category ? this.normalizeKey(category) : 'sin_categoria',
      productType: this.normalizeText(item.productType) || undefined,
      mainImageUrl: this.normalizeText(item.mainImageUrl) || undefined,
      imageUrls: (item.imageUrls ?? [])
        .map((u) => this.normalizeText(u))
        .filter(Boolean),
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      currency: this.normalizeCurrency(item.currency),
      externalId: this.normalizeText(item.externalId) || undefined,
      sku: this.normalizeText(item.sku) || undefined,
      description: this.normalizeText(item.description) || undefined,
      intakeKey: this.buildIntakeKey(item),
    };
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

  private validateDecisionPayload(dto: ChangeProductStateDto) {
    if (!dto.reasons?.length) {
      throw new BadRequestException('La decision requiere al menos un motivo estructurado.');
    }

    if (dto.nextStatus === ProductStatus.EXPORTADO) {
      throw new BadRequestException(
        'El estado exportado solo se alcanza mediante exportacion controlada.',
      );
    }

    if (dto.decisionType === ProductDecisionType.EXPORTAR) {
      throw new BadRequestException(
        'La decision exportar solo se registra mediante el endpoint de exportacion.',
      );
    }

    if (
      dto.decisionType === ProductDecisionType.DESCARTAR &&
      dto.nextStatus !== ProductStatus.DESCARTADO
    ) {
      throw new BadRequestException('La decision descartar debe terminar en estado descartado.');
    }

    if (
      dto.decisionType === ProductDecisionType.PRIORIZAR &&
      dto.nextStatus !== ProductStatus.PRIORIZADO
    ) {
      throw new BadRequestException('La decision priorizar debe terminar en estado priorizado.');
    }

    if (
      dto.decisionType === ProductDecisionType.APROBAR &&
      dto.nextStatus !== ProductStatus.APROBADO
    ) {
      throw new BadRequestException('La decision aprobar debe terminar en estado aprobado.');
    }

    if (dto.decisionType === ProductDecisionType.MARCAR_LISTO_SIGUIENTE_PASO) {
      if (
        dto.nextStatus !== ProductStatus.LISTO_PARA_EXPORTAR &&
        dto.nextStatus !== ProductStatus.CARGADO
      ) {
        throw new BadRequestException(
          'marcar_listo_siguiente_paso solo avanza a listo_para_exportar o reabre a cargado.',
        );
      }
    }
  }

  private async validateImportPayload(
    providerObjectId: Types.ObjectId,
    dto: ImportProductsDto,
  ): Promise<{
    normalized: NormalizedProductInput[];
    errors: ImportValidationError[];
  }> {
    const normalized = dto.products.map((item) => this.normalizeImportItem(item));
    const errors: ImportValidationError[] = [];

    const keyToIndexes = new Map<string, number[]>();
    normalized.forEach((item, index) => {
      if (!item.name) {
        errors.push({ index, field: 'name', message: 'El nombre es obligatorio.' });
      }
      if (item.price == null || item.price < 0.01) {
        errors.push({
          index,
          field: 'price',
          message: 'El precio debe ser un numero mayor a cero.',
        });
      }

      const list = keyToIndexes.get(item.intakeKey) ?? [];
      list.push(index);
      keyToIndexes.set(item.intakeKey, list);
    });

    keyToIndexes.forEach((indexes) => {
      if (indexes.length <= 1) return;
      indexes.forEach((index) => {
        errors.push({
          index,
          field: 'intakeKey',
          message: 'Producto duplicado dentro del mismo archivo (misma clave de intake).',
        });
      });
    });

    const intakeKeys = [...new Set(normalized.map((item) => item.intakeKey))];
    const existing = await this.productModel
      .find({ providerId: providerObjectId, intakeKey: { $in: intakeKeys } }, { intakeKey: 1 })
      .lean()
      .exec();

    const existingSet = new Set(existing.map((item) => item.intakeKey));
    normalized.forEach((item, index) => {
      if (existingSet.has(item.intakeKey)) {
        errors.push({
          index,
          field: 'intakeKey',
          message: 'Producto ya registrado previamente para este proveedor.',
        });
      }
    });

    return { normalized, errors };
  }

  async validateImport(providerId: string, dto: ImportProductsDto) {
    const providerObjectId = await this.assertProviderExists(providerId);
    const { errors, normalized } = await this.validateImportPayload(providerObjectId, dto);

    return {
      valid: errors.length === 0,
      providerId,
      summary: {
        total: normalized.length,
        valid: errors.length === 0 ? normalized.length : 0,
        invalid: errors.length > 0 ? normalized.length : 0,
      },
      errors,
    };
  }

  async importProducts(providerId: string, dto: ImportProductsDto, actorUserId: string) {
    const providerObjectId = await this.assertProviderExists(providerId);
    const { errors, normalized } = await this.validateImportPayload(providerObjectId, dto);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'El archivo JSON contiene errores de validacion.',
        errors,
      });
    }

    const now = new Date();

    const intakeLote = await this.intakeLoteModel.create({
      providerId: providerObjectId,
      kind: 'productos',
      summary: {
        total: normalized.length,
        valid: normalized.length,
        invalid: 0,
        inserted: normalized.length,
      },
      validationErrors: [],
      actorUserId,
    });

    const inserted = await this.productModel.insertMany(
      normalized.map((item) => ({
        providerId: providerObjectId,
        intakeLoteId: intakeLote._id,
        name: item.name,
        category: item.category,
        categoryKey: item.categoryKey,
        productType: item.productType,
        mainImageUrl: item.mainImageUrl,
        imageUrls: item.imageUrls,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        currency: item.currency,
        externalId: item.externalId,
        sku: item.sku,
        description: item.description,
        intakeKey: item.intakeKey,
        status: ProductStatus.CARGADO,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await this.providersService.applyProductIntakeCompleted(providerId, actorUserId);

    return {
      intakeLote,
      insertedCount: inserted.length,
      products: inserted,
    };
  }

  async listIntakeLotes(providerId: string) {
    const providerObjectId = await this.assertProviderExists(providerId);
    const items = await this.intakeLoteModel
      .find({ providerId: providerObjectId, kind: 'productos' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();

    return { items };
  }

  async listProducts(providerId: string, query: ListProductsQueryDto) {
    const providerObjectId = await this.assertProviderExists(providerId);
    const page = query.page && query.page > 0 ? query.page : 1;

    const filter: Record<string, unknown> = { providerId: providerObjectId };
    if (query.status) {
      filter.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    };
  }

  async getProductById(providerId: string, productId: string) {
    const providerObjectId = await this.assertProviderExists(providerId);

    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const product = await this.productModel
      .findOne({ _id: productId, providerId: providerObjectId })
      .lean()
      .exec();

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const decisions = await this.productDecisionModel
      .find({ productId: product._id })
      .sort({ decidedAt: -1 })
      .limit(40)
      .lean()
      .exec();

    return { product, decisions };
  }

  async changeProductStatus(
    providerId: string,
    productId: string,
    dto: ChangeProductStateDto,
    actorUserId: string,
  ) {
    const providerObjectId = await this.assertProviderExists(providerId);
    this.validateDecisionPayload(dto);

    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const product = await this.productModel
      .findOne({ _id: productId, providerId: providerObjectId })
      .exec();

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const allowed = PRODUCT_TRANSITIONS[product.status] ?? [];
    if (!allowed.includes(dto.nextStatus)) {
      throw new ConflictException(
        `Transicion invalida: ${product.status} -> ${dto.nextStatus}`,
      );
    }

    if (
      dto.decisionType === ProductDecisionType.MARCAR_LISTO_SIGUIENTE_PASO &&
      dto.nextStatus === ProductStatus.CARGADO &&
      product.status !== ProductStatus.DESCARTADO
    ) {
      throw new ConflictException(
        'Solo se puede reabrir a cargado desde estado descartado.',
      );
    }

    const previousStatus = product.status;
    product.status = dto.nextStatus;
    product.updatedByUserId = actorUserId;
    await product.save();

    const decision = await this.productDecisionModel.create({
      productId: product._id,
      providerId: providerObjectId,
      decisionType: dto.decisionType,
      previousStatus,
      nextStatus: dto.nextStatus,
      reasons: dto.reasons.map((r) => this.normalizeKey(r)).filter(Boolean),
      comment: this.normalizeText(dto.comment) || undefined,
      actorUserId,
      decidedAt: new Date(),
    });

    return { product, decision };
  }
}
