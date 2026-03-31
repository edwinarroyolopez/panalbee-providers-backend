import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, PipelineStage, Types } from 'mongoose';
import { Provider, ProviderDocument } from './schemas/provider.schema';
import {
  ProviderDecision,
  ProviderDecisionDocument,
} from './schemas/provider-decision.schema';
import {
  ImportProviderItem,
  ImportProvidersDto,
  ProviderImportMode,
} from './dto/import-providers.dto';
import { ListProvidersQueryDto } from './dto/list-providers.dto';
import type { ListProvidersSort } from './dto/list-providers.dto';
import { ChangeProviderStateDto } from './dto/change-provider-state.dto';
import { ProviderDecisionType, ProviderStatus } from './providers.types';
import { IntakeLote, IntakeLoteDocument } from '../products/schemas/intake-lote.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  composeScrapingPromptTemplatesPayload,
  readPromptTemplateIfPresent,
} from './prompt-templates.loader';

export type ProviderImportValidationError = {
  index: number;
  field: string;
  code: string;
  message: string;
  blocksRecord: boolean;
};

type NormalizedProviderInput = {
  name: string;
  mainCategory: string;
  mainCategoryKey: string;
  city?: string;
  country: string;
  phones: string[];
  instagram?: string;
  facebook?: string;
  website?: string;
  address?: string;
  description?: string;
  trustLevel?: number;
  internalNotes?: string;
  intakeKey: string;
};

const PAGE_SIZE = 20;

const TRANSITIONS: Record<ProviderStatus, ProviderStatus[]> = {
  [ProviderStatus.INGRESADO]: [
    ProviderStatus.EN_EVALUACION,
    ProviderStatus.DESCARTADO,
    ProviderStatus.APTO_PARA_SCRAPING,
  ],
  [ProviderStatus.EN_EVALUACION]: [
    ProviderStatus.DESCARTADO,
    ProviderStatus.APTO_PARA_SCRAPING,
    ProviderStatus.CON_PRODUCTOS_CARGADOS,
  ],
  [ProviderStatus.DESCARTADO]: [ProviderStatus.EN_EVALUACION],
  [ProviderStatus.APTO_PARA_SCRAPING]: [
    ProviderStatus.CON_PRODUCTOS_CARGADOS,
    ProviderStatus.DESCARTADO,
    ProviderStatus.EN_EVALUACION,
  ],
  [ProviderStatus.CON_PRODUCTOS_CARGADOS]: [
    ProviderStatus.EN_EVALUACION,
    ProviderStatus.DESCARTADO,
  ],
};

@Injectable()
export class ProvidersService {
  constructor(
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
    @InjectModel(ProviderDecision.name)
    private readonly providerDecisionModel: Model<ProviderDecisionDocument>,
    @InjectModel(IntakeLote.name)
    private readonly intakeLoteModel: Model<IntakeLoteDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async getScrapingPromptTemplates() {
    const scrapingFile = 'prompt-scrapear-productos.md';
    const zipFile = 'prompt-scrapear-productos-zip.md';

    const [scrapingPromptDoc, zipPromptDoc] = await Promise.all([
      readPromptTemplateIfPresent(scrapingFile),
      readPromptTemplateIfPresent(zipFile),
    ]);

    return composeScrapingPromptTemplatesPayload(
      scrapingFile,
      zipFile,
      scrapingPromptDoc,
      zipPromptDoc,
    );
  }

  private normalizeText(input?: string): string {
    return (input ?? '').trim();
  }

  private normalizeKey(input?: string): string {
    return this.normalizeText(input).toLowerCase().replace(/\s+/g, '_');
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private normalizeWebsite(input?: string): string | undefined {
    const raw = this.normalizeText(input);
    if (!raw) return undefined;
    return raw
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/$/, '')
      .toLowerCase();
  }

  private buildIntakeKey(item: {
    name: string;
    country: string;
    website?: string;
  }): string {
    const website = this.normalizeWebsite(item.website);
    if (website) return `web:${website}`;
    return `name:${this.normalizeKey(item.name)}|country:${this.normalizeKey(item.country)}`;
  }

  private normalizeImportItem(item: ImportProviderItem): NormalizedProviderInput {
    const website = this.normalizeWebsite(item.website);
    return {
      name: this.normalizeText(item.name),
      mainCategory: this.normalizeText(item.category),
      mainCategoryKey: this.normalizeKey(item.category),
      city: this.normalizeText(item.city) || undefined,
      country: this.normalizeText(item.country),
      phones: (item.phones ?? []).map((phone) => this.normalizeText(phone)).filter(Boolean),
      instagram: this.normalizeText(item.instagram) || undefined,
      facebook: this.normalizeText(item.facebook) || undefined,
      website,
      address: this.normalizeText(item.address) || undefined,
      description: this.normalizeText(item.description) || undefined,
      trustLevel: item.trustLevel,
      internalNotes: this.normalizeText(item.internalNotes) || undefined,
      intakeKey: this.buildIntakeKey({
        name: item.name,
        country: item.country,
        website: item.website,
      }),
    };
  }

  private blockedIndicesFromErrors(errors: ProviderImportValidationError[]): Set<number> {
    const blocked = new Set<number>();
    for (const e of errors) {
      if (e.blocksRecord) blocked.add(e.index);
    }
    return blocked;
  }

  private summarizeProviderImport(
    total: number,
    errors: ProviderImportValidationError[],
  ): {
    total: number;
    insertableCount: number;
    notInsertableCount: number;
    errorCount: number;
    insertableIndices: number[];
  } {
    const blocked = this.blockedIndicesFromErrors(errors);
    const insertableIndices: number[] = [];
    for (let i = 0; i < total; i += 1) {
      if (!blocked.has(i)) insertableIndices.push(i);
    }
    return {
      total,
      insertableCount: insertableIndices.length,
      notInsertableCount: blocked.size,
      errorCount: errors.length,
      insertableIndices,
    };
  }

  private async validateImportPayload(dto: ImportProvidersDto): Promise<{
    normalized: NormalizedProviderInput[];
    errors: ProviderImportValidationError[];
  }> {
    const normalized = dto.providers.map((item) => this.normalizeImportItem(item));
    const errors: ProviderImportValidationError[] = [];

    const keyToIndexes = new Map<string, number[]>();

    normalized.forEach((item, index) => {
      if (!item.name) {
        errors.push({
          index,
          field: 'name',
          code: 'campo_requerido',
          message: 'El nombre es obligatorio.',
          blocksRecord: true,
        });
      }

      if (!item.mainCategory) {
        errors.push({
          index,
          field: 'category',
          code: 'campo_requerido',
          message: 'La categoría principal es obligatoria.',
          blocksRecord: true,
        });
      }

      if (!item.country) {
        errors.push({
          index,
          field: 'country',
          code: 'campo_requerido',
          message: 'El país es obligatorio.',
          blocksRecord: true,
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
          code: 'duplicado_en_archivo',
          message: 'Proveedor duplicado dentro del mismo archivo (misma clave de intake).',
          blocksRecord: true,
        });
      });
    });

    const intakeKeys = [...new Set(normalized.map((item) => item.intakeKey))];
    const existingProviders = await this.providerModel
      .find({ intakeKey: { $in: intakeKeys } }, { intakeKey: 1 })
      .lean()
      .exec();

    const existingSet = new Set(existingProviders.map((item) => item.intakeKey));

    normalized.forEach((item, index) => {
      if (existingSet.has(item.intakeKey)) {
        errors.push({
          index,
          field: 'intakeKey',
          code: 'duplicado_en_base',
          message: 'Ya existe un proveedor con la misma clave de intake en el airlock.',
          blocksRecord: true,
        });
      }
    });

    return { normalized, errors };
  }

  async validateImport(dto: ImportProvidersDto) {
    const { errors, normalized } = await this.validateImportPayload(dto);
    const summary = this.summarizeProviderImport(normalized.length, errors);

    return {
      valid: summary.insertableCount === summary.total,
      summary,
      errors,
    };
  }

  async importProviders(dto: ImportProvidersDto, actorUserId: string) {
    const importMode: ProviderImportMode = dto.importMode ?? 'all_or_nothing';
    const { errors, normalized } = await this.validateImportPayload(dto);
    const summary = this.summarizeProviderImport(normalized.length, errors);

    if (importMode === 'all_or_nothing' && errors.length > 0) {
      throw new BadRequestException({
        message: 'El archivo JSON contiene errores de validación.',
        errors,
        summary,
      });
    }

    const blocked = this.blockedIndicesFromErrors(errors);
    const toInsert = normalized.filter((_, i) => !blocked.has(i));

    if (toInsert.length === 0) {
      throw new BadRequestException({
        message: 'No hay registros insertables en este archivo.',
        errors,
        summary,
      });
    }

    const validationSnapshot = errors.map((e) => ({
      index: e.index,
      field: e.field,
      message: e.message,
      code: e.code,
      blocksRecord: e.blocksRecord,
    }));

    const now = new Date();
    const lotePayload = {
      kind: 'proveedores' as const,
      summary: {
        total: normalized.length,
        valid: summary.insertableCount,
        invalid: summary.notInsertableCount,
        inserted: toInsert.length,
        skipped:
          importMode === 'insert_valid_only' ? summary.notInsertableCount : undefined,
        importMode,
      },
      validationErrors: importMode === 'insert_valid_only' ? validationSnapshot : [],
      actorUserId,
    };

    const session: ClientSession = await this.providerModel.startSession();
    let intakeLote: IntakeLoteDocument;
    let inserted: ProviderDocument[];
    try {
      await session.withTransaction(async () => {
        const [created] = await this.intakeLoteModel.create([lotePayload], { session });
        intakeLote = created;
        const docs = toInsert.map((item) => ({
          ...item,
          intakeLoteId: created._id,
          status: ProviderStatus.INGRESADO,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          createdAt: now,
          updatedAt: now,
        }));
        inserted = await this.providerModel.insertMany(docs, { session });
      });
    } finally {
      await session.endSession();
    }

    const skippedCount = normalized.length - inserted!.length;

    return {
      intakeLote: intakeLote!,
      insertedCount: inserted!.length,
      skippedCount,
      importMode,
      providers: inserted!,
    };
  }

  async listProviderImportLotes() {
    const items = await this.intakeLoteModel
      .find({ kind: 'proveedores' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    return { items };
  }

  async revertProviderImportLote(loteId: string, actorUserId: string) {
    if (!Types.ObjectId.isValid(loteId)) {
      throw new NotFoundException('Carga no encontrada.');
    }

    const lote = await this.intakeLoteModel.findById(loteId).exec();
    if (!lote || lote.kind !== 'proveedores') {
      throw new NotFoundException('Carga no encontrada.');
    }

    if (lote.revokedAt) {
      throw new ConflictException('Esta carga ya fue revertida previamente.');
    }

    const providers = await this.providerModel.find({ intakeLoteId: lote._id }).exec();

    for (const p of providers) {
      if (p.status !== ProviderStatus.INGRESADO) {
        throw new ConflictException(
          `No se puede revertir la carga: el proveedor «${p.name}» ya fue movido de estado ingresado.`,
        );
      }
      const productCount = await this.productModel.countDocuments({ providerId: p._id }).exec();
      if (productCount > 0) {
        throw new ConflictException(
          `No se puede revertir la carga: el proveedor «${p.name}» ya tiene productos asociados.`,
        );
      }
    }

    const session: ClientSession = await this.providerModel.startSession();
    let deletedCount = 0;
    try {
      await session.withTransaction(async () => {
        const del = await this.providerModel
          .deleteMany({ intakeLoteId: lote._id })
          .session(session)
          .exec();
        deletedCount = del.deletedCount ?? 0;
        await this.intakeLoteModel
          .findByIdAndUpdate(
            lote._id,
            { revokedAt: new Date(), revokedByUserId: actorUserId },
            { session },
          )
          .exec();
      });
    } finally {
      await session.endSession();
    }

    return {
      ok: true,
      deletedProviderCount: deletedCount,
      loteId: String(lote._id),
      revokedAt: new Date().toISOString(),
    };
  }

  async listProviders(query: ListProvidersQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const categoryKey = this.normalizeKey(query.category);
    const search = this.normalizeText(query.search);

    const initialMatch: Record<string, unknown> = {};
    if (categoryKey) {
      initialMatch.mainCategoryKey = categoryKey;
    }
    if (search) {
      initialMatch.name = { $regex: this.escapeRegex(search), $options: 'i' };
    }

    const sortKey: ListProvidersSort = query.sort ?? 'products_first';
    let sortSpec: Record<string, 1 | -1>;
    switch (sortKey) {
      case 'recent':
        sortSpec = { createdAt: -1 };
        break;
      case 'name_asc':
        sortSpec = { name: 1 };
        break;
      case 'name_desc':
        sortSpec = { name: -1 };
        break;
      case 'products_first':
      default:
        sortSpec = { hasProducts: -1, createdAt: -1 };
        break;
    }

    const pipeline: PipelineStage[] = [];

    if (Object.keys(initialMatch).length > 0) {
      pipeline.push({ $match: initialMatch });
    }

    pipeline.push({
      $lookup: {
        from: 'products',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$providerId', '$$pid'] } } },
          { $count: 'c' },
        ],
        as: 'productCountArr',
      },
    });

    pipeline.push({
      $addFields: {
        productCount: {
          $ifNull: [{ $arrayElemAt: ['$productCountArr.c', 0] }, 0],
        },
      },
    });

    pipeline.push({
      $addFields: {
        hasProducts: { $gt: ['$productCount', 0] },
        hasWebsite: {
          $gt: [
            { $strLenCP: { $trim: { input: { $ifNull: ['$website', ''] } } } },
            0,
          ],
        },
      },
    });

    if (query.hasWebsite === 'true') {
      pipeline.push({ $match: { hasWebsite: true } });
    } else if (query.hasWebsite === 'false') {
      pipeline.push({ $match: { hasWebsite: false } });
    }

    if (query.hasProducts === 'true') {
      pipeline.push({ $match: { hasProducts: true } });
    } else if (query.hasProducts === 'false') {
      pipeline.push({ $match: { hasProducts: false } });
    }

    pipeline.push({ $sort: sortSpec });

    pipeline.push({
      $facet: {
        items: [
          { $skip: (page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          { $project: { productCountArr: 0 } },
        ],
        meta: [{ $count: 'total' }],
      },
    });

    const [facetResult, categories] = await Promise.all([
      this.providerModel.aggregate(pipeline).exec(),
      this.providerModel.distinct('mainCategory').exec(),
    ]);

    const bundle = facetResult[0] as
      | { items: Record<string, unknown>[]; meta: { total: number }[] }
      | undefined;
    const rawItems = bundle?.items ?? [];
    const total = bundle?.meta?.[0]?.total ?? 0;

    const items = rawItems.map((doc) => {
      const { hasWebsite: hw, hasProducts: hp, productCount: pc, ...rest } = doc;
      return {
        ...rest,
        hasWebsite: Boolean(hw),
        hasProducts: Boolean(hp),
        productCount: typeof pc === 'number' ? pc : 0,
      };
    });

    return {
      items,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
      filters: {
        categories: categories.sort((a, b) => a.localeCompare(b)),
      },
    };
  }

  async getProviderById(providerId: string) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    const provider = await this.providerModel.findById(providerId).lean().exec();
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    const decisions = await this.providerDecisionModel
      .find({ providerId: provider._id })
      .sort({ decidedAt: -1 })
      .limit(50)
      .lean()
      .exec();

    return {
      provider,
      decisions,
    };
  }

  private validateDecisionRules(dto: ChangeProviderStateDto) {
    if (!dto.reasons?.length) {
      throw new BadRequestException('La decision requiere al menos un motivo estructurado.');
    }

    if (
      dto.decisionType === ProviderDecisionType.DESCARTAR &&
      dto.nextStatus !== ProviderStatus.DESCARTADO
    ) {
      throw new BadRequestException('La decision descartar debe terminar en estado descartado.');
    }
  }

  async changeProviderStatus(
    providerId: string,
    dto: ChangeProviderStateDto,
    actorUserId: string,
  ) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    this.validateDecisionRules(dto);

    const provider = await this.providerModel.findById(providerId).exec();
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    const allowed = TRANSITIONS[provider.status] ?? [];
    if (!allowed.includes(dto.nextStatus)) {
      throw new ConflictException(
        `Transicion invalida: ${provider.status} -> ${dto.nextStatus}`,
      );
    }

    const previousStatus = provider.status;
    provider.status = dto.nextStatus;
    provider.updatedByUserId = actorUserId;
    await provider.save();

    const decision = await this.providerDecisionModel.create({
      providerId: provider._id,
      decisionType: dto.decisionType,
      previousStatus,
      nextStatus: dto.nextStatus,
      reasons: dto.reasons.map((reason) => this.normalizeKey(reason)).filter(Boolean),
      comment: this.normalizeText(dto.comment) || undefined,
      actorUserId,
      decidedAt: new Date(),
    });

    return {
      provider,
      decision,
    };
  }

  /**
   * Tras intake de productos: si el flujo del proveedor lo permite, pasa a `con_productos_cargados`
   * con decisión trazable (no implica aprobación de productos).
   */
  async applyProductIntakeCompleted(providerId: string, actorUserId: string) {
    if (!Types.ObjectId.isValid(providerId)) return;

    const provider = await this.providerModel.findById(providerId).exec();
    if (!provider || provider.status === ProviderStatus.CON_PRODUCTOS_CARGADOS) return;

    const allowed = TRANSITIONS[provider.status] ?? [];
    if (!allowed.includes(ProviderStatus.CON_PRODUCTOS_CARGADOS)) return;

    await this.changeProviderStatus(
      providerId,
      {
        nextStatus: ProviderStatus.CON_PRODUCTOS_CARGADOS,
        decisionType: ProviderDecisionType.MARCAR_LISTO_SIGUIENTE_PASO,
        reasons: ['carga_de_productos_registrada'],
        comment: 'Transicion operativa por intake de productos vinculado al proveedor.',
      },
      actorUserId,
    );
  }
}
