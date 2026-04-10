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
  ProviderShortlistEntry,
  ProviderShortlistEntryDocument,
} from './schemas/provider-shortlist-entry.schema';
import {
  ProviderDecision,
  ProviderDecisionDocument,
} from './schemas/provider-decision.schema';
import { ProviderEvent, ProviderEventDocument } from './schemas/provider-event.schema';
import {
  ImportProviderItem,
  ImportProvidersDto,
  ProviderImportMode,
} from './dto/import-providers.dto';
import { ListProvidersQueryDto } from './dto/list-providers.dto';
import type { ListProvidersIntelRec, ListProvidersSort } from './dto/list-providers.dto';
import { ChangeProviderStateDto } from './dto/change-provider-state.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { CreateProviderEventDto } from './dto/create-provider-event.dto';
import type { AddProviderShortlistDto } from './dto/provider-shortlist.dto';
import { ProviderDecisionType, ProviderEventType, ProviderStatus } from './providers.types';
import { IntakeLote, IntakeLoteDocument } from '../products/schemas/intake-lote.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  composeResearchPromptTemplatePayload,
  composeScrapingPromptTemplatesPayload,
  readPromptTemplateIfPresent,
} from './prompt-templates.loader';
import {
  buildIntakeKey,
  normalizeKey as normalizeProviderCategoryKey,
  normalizeProviderImportRow,
  normalizeWebsiteKey,
} from './lib/provider-import-normalize';
import { parseIntelFromInternalNotes } from './lib/provider-intel-parse';

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
/** Tope de filas en vista pipeline (misma fuente de verdad que listado; sin persistencia extra). */
const PIPELINE_MAX = 400;

const PIPELINE_BUCKET_ORDER = [
  'priorizar_para_panalbee',
  'priorizar_para_growth',
  'priorizar_para_ambos',
  'revisar_manual',
  'descartar',
] as const;

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
    @InjectModel(ProviderShortlistEntry.name)
    private readonly providerShortlistModel: Model<ProviderShortlistEntryDocument>,
    @InjectModel(ProviderEvent.name)
    private readonly providerEventModel: Model<ProviderEventDocument>,
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

  async getResearchPromptTemplate() {
    const fileName = 'prompt-buscar-proveedores.md';
    const researchPromptDoc = await readPromptTemplateIfPresent(fileName);
    return composeResearchPromptTemplatePayload(fileName, researchPromptDoc);
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

  private toISOStringSafe(value: Date | string | undefined): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return new Date(0).toISOString();
  }

  private sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      const k = this.normalizeText(key);
      if (!k) continue;
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        out[k] = value;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private ensureProviderId(providerId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new NotFoundException('Proveedor no encontrado.');
    }
    return new Types.ObjectId(providerId);
  }

  private buildTimelineItems(
    decisions: Array<{
      _id: Types.ObjectId;
      decisionType: ProviderDecisionType;
      previousStatus: ProviderStatus;
      nextStatus: ProviderStatus;
      reasons: string[];
      comment?: string;
      actorUserId: string;
      decidedAt: Date | string;
    }>,
    events: Array<{
      _id: Types.ObjectId;
      eventType: ProviderEventType;
      title: string;
      comment?: string;
      meta?: Record<string, unknown>;
      actorUserId: string;
      createdAt: Date | string;
    }>,
  ) {
    const decisionItems = decisions.map((d) => ({
      id: String(d._id),
      kind: 'decision' as const,
      at: this.toISOStringSafe(d.decidedAt),
      actorUserId: d.actorUserId,
      type: d.decisionType,
      title: `${d.decisionType} · ${d.previousStatus} → ${d.nextStatus}`,
      comment: this.normalizeText(d.comment) || undefined,
      reasons: d.reasons,
      decision: {
        decisionType: d.decisionType,
        previousStatus: d.previousStatus,
        nextStatus: d.nextStatus,
      },
    }));

    const eventItems = events.map((event) => ({
      id: String(event._id),
      kind: 'event' as const,
      at: this.toISOStringSafe(event.createdAt),
      actorUserId: event.actorUserId,
      type: event.eventType,
      title: event.title,
      comment: this.normalizeText(event.comment) || undefined,
      meta: event.meta,
    }));

    return [...decisionItems, ...eventItems].sort((a, b) => b.at.localeCompare(a.at));
  }

  private hasOwnField<T extends object, K extends PropertyKey>(obj: T, key: K): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  private buildProviderDraftForUpdate(provider: ProviderDocument, dto: UpdateProviderDto): ImportProviderItem {
    const raw = {
      name: this.hasOwnField(dto, 'name') ? dto.name : provider.name,
      category: this.hasOwnField(dto, 'mainCategory') ? dto.mainCategory : provider.mainCategory,
      city: this.hasOwnField(dto, 'city') ? dto.city : provider.city,
      country: this.hasOwnField(dto, 'country') ? dto.country : provider.country,
      phones: this.hasOwnField(dto, 'phones') ? dto.phones : provider.phones,
      instagram: this.hasOwnField(dto, 'instagram') ? dto.instagram : provider.instagram,
      facebook: this.hasOwnField(dto, 'facebook') ? dto.facebook : provider.facebook,
      website: this.hasOwnField(dto, 'website') ? dto.website : provider.website,
      address: this.hasOwnField(dto, 'address') ? dto.address : provider.address,
      description: this.hasOwnField(dto, 'description') ? dto.description : provider.description,
      trustLevel: this.hasOwnField(dto, 'trustLevel') ? dto.trustLevel : provider.trustLevel,
      internalNotes: this.hasOwnField(dto, 'internalNotes')
        ? dto.internalNotes
        : provider.internalNotes,
    };

    return {
      name: raw.name ?? '',
      category: raw.category ?? '',
      country: raw.country ?? '',
      city: raw.city ?? '',
      phones: Array.isArray(raw.phones) ? raw.phones : [],
      instagram: raw.instagram,
      facebook: raw.facebook,
      website: raw.website,
      address: raw.address,
      description: raw.description,
      trustLevel: raw.trustLevel,
      internalNotes: raw.internalNotes,
    };
  }

  private mapIntelPreview(notes?: string): {
    recommendation: string;
    headline?: string;
    frictions: string[];
    growthOpportunity?: number;
    dataQuality?: number;
    supplyFit?: number;
    nextStepCode?: string;
    confidence?: number;
    signalPreview?: string[];
  } | null {
    const p = parseIntelFromInternalNotes(notes);
    if (!p) return null;
    const sig = p.signalTokens.slice(0, 2);
    return {
      recommendation: p.recommendation,
      headline: p.rationale,
      frictions: p.frictions.slice(0, 4),
      growthOpportunity: p.scores.growthOpportunityScore,
      dataQuality: p.scores.dataQualityScore,
      supplyFit: p.scores.supplyFitScore,
      nextStepCode: p.nextStepCode?.trim() || undefined,
      confidence: p.scores.confidenceScore,
      signalPreview: sig.length > 0 ? sig : undefined,
    };
  }

  /** Orden dentro de cada bucket: GO ↓, confianza ↓, surtido ↓, más reciente. */
  private comparePipelineItems(
    a: { intelPreview: ReturnType<ProvidersService['mapIntelPreview']>; createdAt?: Date | string },
    b: { intelPreview: ReturnType<ProvidersService['mapIntelPreview']>; createdAt?: Date | string },
  ): number {
    const pa = a.intelPreview;
    const pb = b.intelPreview;
    const goa = pa?.growthOpportunity ?? -1;
    const gob = pb?.growthOpportunity ?? -1;
    if (gob !== goa) return gob - goa;
    const ca = pa?.confidence ?? -1;
    const cb = pb?.confidence ?? -1;
    if (cb !== ca) return cb - ca;
    const sfa = pa?.supplyFit ?? -1;
    const sfb = pb?.supplyFit ?? -1;
    if (sfb !== sfa) return sfb - sfa;
    const ta = typeof a.createdAt === 'string' ? a.createdAt : (a.createdAt?.toISOString?.() ?? '');
    const tb = typeof b.createdAt === 'string' ? b.createdAt : (b.createdAt?.toISOString?.() ?? '');
    return tb.localeCompare(ta);
  }

  private buildPipelineGrouping(
    items: {
      intelPreview: ReturnType<ProvidersService['mapIntelPreview']>;
      createdAt?: Date | string;
      [key: string]: unknown;
    }[],
    totalMatched: number,
  ): {
    buckets: { key: string; items: typeof items }[];
    sinLectura: typeof items;
    truncated: boolean;
    totalMatched: number;
    flatOrdered: typeof items;
  } {
    const buckets = new Map<string, typeof items>();
    for (const k of PIPELINE_BUCKET_ORDER) {
      buckets.set(k, []);
    }
    const sinLectura: typeof items = [];
    for (const item of items) {
      const rec = item.intelPreview?.recommendation;
      if (!rec || !buckets.has(rec)) {
        sinLectura.push(item);
        continue;
      }
      buckets.get(rec)!.push(item);
    }
    for (const arr of buckets.values()) {
      arr.sort((x, y) => this.comparePipelineItems(x, y));
    }
    sinLectura.sort((x, y) => this.comparePipelineItems(x, y));

    const orderedBuckets = PIPELINE_BUCKET_ORDER.map((key) => ({
      key,
      items: buckets.get(key) ?? [],
    }));
    const flatOrdered = [
      ...orderedBuckets.flatMap((b) => b.items),
      ...sinLectura,
    ];
    return {
      buckets: orderedBuckets,
      sinLectura,
      truncated: totalMatched > items.length,
      totalMatched,
      flatOrdered,
    };
  }

  private intelRecMatch(intelRec?: ListProvidersIntelRec): Record<string, unknown> | null {
    if (!intelRec || intelRec === 'all') return null;
    if (intelRec === 'sin_intel') {
      return {
        $or: [
          { internalNotes: { $exists: false } },
          { internalNotes: null },
          { internalNotes: '' },
          { internalNotes: { $not: /intel:/i } },
        ],
      };
    }
    const esc = this.escapeRegex(intelRec);
    return {
      internalNotes: {
        $regex: `intel:[^\\n]*rec\\s*=\\s*${esc}`,
        $options: 'i',
      },
    };
  }

  private normalizeImportItem(item: ImportProviderItem): NormalizedProviderInput {
    const row = normalizeProviderImportRow(item);
    return {
      name: row.name,
      mainCategory: row.category,
      mainCategoryKey: normalizeProviderCategoryKey(row.category),
      city: row.city,
      country: row.country,
      phones: row.phones ?? [],
      instagram: row.instagram,
      facebook: row.facebook,
      website: row.website,
      address: row.address,
      description: row.description,
      trustLevel: row.trustLevel,
      internalNotes: row.internalNotes,
      intakeKey: buildIntakeKey({
        name: row.name,
        country: row.country,
        website: row.website,
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
    const isPipeline = query.view === 'pipeline';

    const initialMatch: Record<string, unknown> = {};
    if (categoryKey) {
      initialMatch.mainCategoryKey = categoryKey;
    }
    if (search) {
      initialMatch.name = { $regex: this.escapeRegex(search), $options: 'i' };
    }

    const sortKeyRequested: ListProvidersSort = query.sort ?? 'products_first';
    /** En pipeline forzamos GO desc para que el tope de filas priorice oportunidad antes de agrupar. */
    const effectiveSort: ListProvidersSort = isPipeline ? 'intel_growth_desc' : sortKeyRequested;
    const needsIntelGoScore =
      effectiveSort === 'intel_growth_desc' ||
      effectiveSort === 'intel_growth_asc' ||
      query.intelGrowth === 'alta' ||
      query.intelGrowth === 'media';

    let sortSpec: Record<string, 1 | -1>;
    switch (effectiveSort) {
      case 'recent':
        sortSpec = { createdAt: -1 };
        break;
      case 'name_asc':
        sortSpec = { name: 1 };
        break;
      case 'name_desc':
        sortSpec = { name: -1 };
        break;
      case 'intel_growth_desc':
        sortSpec = { _intelGoOrd: -1, createdAt: -1 };
        break;
      case 'intel_growth_asc':
        sortSpec = { _intelGoOrd: 1, createdAt: -1 };
        break;
      case 'products_first':
      default:
        sortSpec = { hasProducts: -1, createdAt: -1 };
        break;
    }

    const pageSlice = isPipeline ? PIPELINE_MAX : PAGE_SIZE;
    const skip = isPipeline ? 0 : (page - 1) * PAGE_SIZE;

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

    if (needsIntelGoScore) {
      pipeline.push({
        $addFields: {
          intelGoScore: {
            $let: {
              vars: {
                rf: {
                  $regexFind: {
                    input: { $ifNull: ['$internalNotes', ''] },
                    regex: 'go\\s*=\\s*(\\d{1,3})',
                    options: 'i',
                  },
                },
              },
              in: {
                $convert: {
                  input: {
                    $arrayElemAt: [{ $ifNull: ['$$rf.captures', []] }, 0],
                  },
                  to: 'int',
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
        },
      });
    }

    const intelRecFilter = this.intelRecMatch(query.intelRec);
    if (intelRecFilter) {
      pipeline.push({ $match: intelRecFilter });
    }

    if (query.intelGrowth === 'alta') {
      pipeline.push({ $match: { intelGoScore: { $gte: 65 } } });
    } else if (query.intelGrowth === 'media') {
      pipeline.push({ $match: { intelGoScore: { $gte: 40 } } });
    }

    if (effectiveSort === 'intel_growth_desc') {
      pipeline.push({
        $addFields: {
          _intelGoOrd: { $ifNull: ['$intelGoScore', -1] },
        },
      });
    } else if (effectiveSort === 'intel_growth_asc') {
      pipeline.push({
        $addFields: {
          _intelGoOrd: { $ifNull: ['$intelGoScore', 999] },
        },
      });
    }

    pipeline.push({ $sort: sortSpec });

    pipeline.push({
      $facet: {
        items: [
          { $skip: skip },
          { $limit: pageSlice },
          {
            $project: {
              productCountArr: 0,
              intelGoScore: 0,
              _intelGoOrd: 0,
            },
          },
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
      const notes = typeof doc.internalNotes === 'string' ? doc.internalNotes : undefined;
      const intelPreview = this.mapIntelPreview(notes);
      const {
        hasWebsite: hw,
        hasProducts: hp,
        productCount: pc,
        internalNotes: _dropNotes,
        ...rest
      } = doc;
      return {
        ...rest,
        hasWebsite: Boolean(hw),
        hasProducts: Boolean(hp),
        productCount: typeof pc === 'number' ? pc : 0,
        intelPreview,
      };
    });

    const categoriesSorted = categories.sort((a, b) => a.localeCompare(b));

    if (isPipeline) {
      const grouping = this.buildPipelineGrouping(items, total);
      return {
        view: 'pipeline' as const,
        items: grouping.flatOrdered,
        pagination: {
          page: 1,
          pageSize: grouping.flatOrdered.length,
          total,
          totalPages: Math.max(1, Math.ceil(total / PIPELINE_MAX)),
        },
        filters: {
          categories: categoriesSorted,
        },
        pipeline: {
          buckets: grouping.buckets.map((b) => ({
            key: b.key,
            count: b.items.length,
            items: b.items,
          })),
          sinLectura: {
            count: grouping.sinLectura.length,
            items: grouping.sinLectura,
          },
          truncated: grouping.truncated,
          totalMatched: grouping.totalMatched,
        },
      };
    }

    return {
      view: 'list' as const,
      items,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
      filters: {
        categories: categoriesSorted,
      },
    };
  }

  async updateProviderMetadata(providerId: string, dto: UpdateProviderDto, actorUserId: string) {
    const providerObjectId = this.ensureProviderId(providerId);
    const provider = await this.providerModel.findById(providerObjectId).exec();
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    const previousWebsiteKey = normalizeWebsiteKey(provider.website);
    const normalizedDraft = normalizeProviderImportRow(this.buildProviderDraftForUpdate(provider, dto));

    if (!normalizedDraft.name) {
      throw new BadRequestException('El nombre no puede quedar vacío.');
    }
    if (!normalizedDraft.category) {
      throw new BadRequestException('La categoría principal no puede quedar vacía.');
    }
    if (!normalizedDraft.country) {
      throw new BadRequestException('El país no puede quedar vacío.');
    }

    const nextIntakeKey = buildIntakeKey({
      name: normalizedDraft.name,
      country: normalizedDraft.country,
      website: normalizedDraft.website,
    });

    const conflict = await this.providerModel
      .findOne({ intakeKey: nextIntakeKey, _id: { $ne: provider._id } })
      .select({ _id: 1 })
      .lean()
      .exec();
    if (conflict) {
      throw new ConflictException(
        'Existe otro proveedor con la misma clave de intake. Revisa nombre, país o website.',
      );
    }

    provider.name = normalizedDraft.name;
    provider.mainCategory = normalizedDraft.category;
    provider.mainCategoryKey = normalizeProviderCategoryKey(normalizedDraft.category);
    provider.country = normalizedDraft.country;
    provider.city = normalizedDraft.city || undefined;
    provider.phones = normalizedDraft.phones ?? [];
    provider.instagram = normalizedDraft.instagram;
    provider.facebook = normalizedDraft.facebook;
    provider.website = normalizedDraft.website;
    provider.address = normalizedDraft.address;
    provider.description = normalizedDraft.description;
    provider.trustLevel = normalizedDraft.trustLevel;
    provider.internalNotes = normalizedDraft.internalNotes;
    provider.intakeKey = nextIntakeKey;
    provider.updatedByUserId = actorUserId;

    await provider.save();

    const nextWebsiteKey = normalizeWebsiteKey(provider.website);
    const autoEvents: ProviderEventDocument[] = [];

    if (!previousWebsiteKey && nextWebsiteKey) {
      const created = await this.providerEventModel.create({
        providerId: provider._id,
        eventType: ProviderEventType.WEBSITE_AGREGADO,
        title: 'Website operativo agregado',
        comment: `Se registró website válido: ${provider.website}`,
        actorUserId,
        meta: { website: provider.website },
        createdAt: new Date(),
      });
      autoEvents.push(created);
    } else if (previousWebsiteKey && nextWebsiteKey && previousWebsiteKey !== nextWebsiteKey) {
      const created = await this.providerEventModel.create({
        providerId: provider._id,
        eventType: ProviderEventType.WEBSITE_CORREGIDO,
        title: 'Website corregido',
        comment: `${previousWebsiteKey} → ${nextWebsiteKey}`,
        actorUserId,
        meta: {
          previousWebsite: previousWebsiteKey,
          nextWebsite: nextWebsiteKey,
        },
        createdAt: new Date(),
      });
      autoEvents.push(created);
    }

    return {
      provider: provider.toObject(),
      autoEvents: autoEvents.map((event) => ({
        _id: String(event._id),
        providerId: String(event.providerId),
        eventType: event.eventType,
        title: event.title,
        comment: event.comment,
        meta: event.meta,
        actorUserId: event.actorUserId,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async createProviderEvent(providerId: string, dto: CreateProviderEventDto, actorUserId: string) {
    const providerObjectId = this.ensureProviderId(providerId);
    const provider = await this.providerModel.findById(providerObjectId).lean().exec();
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    const title = this.normalizeText(dto.title);
    if (!title) {
      throw new BadRequestException('El título del evento es obligatorio.');
    }

    const event = await this.providerEventModel.create({
      providerId: provider._id,
      eventType: dto.eventType,
      title,
      comment: this.normalizeText(dto.comment) || undefined,
      meta: this.sanitizeMeta(dto.meta),
      actorUserId,
      createdAt: new Date(),
    });

    return {
      event: {
        _id: String(event._id),
        providerId: String(event.providerId),
        eventType: event.eventType,
        title: event.title,
        comment: event.comment,
        meta: event.meta,
        actorUserId: event.actorUserId,
        createdAt: event.createdAt.toISOString(),
      },
    };
  }

  async getProviderById(providerId: string, accountId: string) {
    this.ensureProviderId(providerId);

    const provider = await this.providerModel.findById(providerId).lean().exec();
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    const [decisions, rawEvents] = await Promise.all([
      this.providerDecisionModel
        .find({ providerId: provider._id })
        .sort({ decidedAt: -1 })
        .limit(50)
        .lean()
        .exec(),
      this.providerEventModel
        .find({ providerId: provider._id })
        .sort({ createdAt: -1 })
        .limit(80)
        .lean()
        .exec(),
    ]);

    const events = rawEvents.map((event) => ({
      _id: String(event._id),
      providerId: String(event.providerId),
      eventType: event.eventType,
      title: event.title,
      comment: event.comment,
      meta: event.meta,
      actorUserId: event.actorUserId,
      createdAt:
        event.createdAt instanceof Date
          ? event.createdAt.toISOString()
          : String(event.createdAt ?? ''),
    }));

    const timeline = this.buildTimelineItems(decisions, rawEvents);

    const shortlistEntry = await this.providerShortlistModel
      .findOne({
        accountId: new Types.ObjectId(accountId),
        providerId: provider._id,
      })
      .lean()
      .exec();

    const slRow = shortlistEntry as (typeof shortlistEntry) & { updatedAt?: Date };

    return {
      provider,
      decisions,
      events,
      timeline,
      intelParsed: parseIntelFromInternalNotes(
        typeof provider.internalNotes === 'string' ? provider.internalNotes : undefined,
      ),
      shortlist: shortlistEntry
        ? {
            onList: true,
            note: shortlistEntry.note,
            updatedAt:
              slRow.updatedAt instanceof Date
                ? slRow.updatedAt.toISOString()
                : String(slRow.updatedAt ?? ''),
          }
        : { onList: false },
    };
  }

  async listProviderShortlist(accountId: string) {
    const accOid = new Types.ObjectId(accountId);
    const entries = await this.providerShortlistModel
      .find({ accountId: accOid })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const providerIds = entries.map((e) => e.providerId);
    if (providerIds.length === 0) {
      return { items: [] as Record<string, unknown>[] };
    }

    const providers = await this.providerModel
      .find({ _id: { $in: providerIds } })
      .lean()
      .exec();
    const byId = new Map(providers.map((p) => [String(p._id), p]));

    const items = entries
      .map((e) => {
        const p = byId.get(String(e.providerId));
        if (!p) return null;
        const notes = typeof p.internalNotes === 'string' ? p.internalNotes : undefined;
        const row = e as typeof e & { createdAt?: Date; updatedAt?: Date };
        return {
          entryId: String(e._id),
          providerId: String(e.providerId),
          note: e.note,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          createdByUserId: e.createdByUserId,
          provider: {
            _id: String(p._id),
            name: p.name,
            mainCategory: p.mainCategory,
            status: p.status,
            city: p.city,
            country: p.country,
            website: p.website,
            intelPreview: this.mapIntelPreview(notes),
          },
        };
      })
      .filter(Boolean);

    return { items };
  }

  async addProviderShortlist(accountId: string, actorUserId: string, dto: AddProviderShortlistDto) {
    const { providerId } = dto;
    if (!Types.ObjectId.isValid(providerId)) {
      throw new BadRequestException('providerId inválido.');
    }

    const provider = await this.providerModel.findById(providerId).lean().exec();
    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado.');
    }

    const note = this.normalizeText(dto.note) || undefined;
    try {
      await this.providerShortlistModel.create({
        accountId: new Types.ObjectId(accountId),
        providerId: new Types.ObjectId(providerId),
        note,
        createdByUserId: actorUserId,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000) {
        throw new ConflictException('Este proveedor ya está en la shortlist comercial.');
      }
      throw err;
    }

    return { ok: true as const, providerId };
  }

  async removeProviderShortlist(accountId: string, providerId: string) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new BadRequestException('providerId inválido.');
    }

    const res = await this.providerShortlistModel
      .deleteOne({
        accountId: new Types.ObjectId(accountId),
        providerId: new Types.ObjectId(providerId),
      })
      .exec();

    if (res.deletedCount === 0) {
      throw new NotFoundException('No estaba en la shortlist.');
    }

    return { ok: true as const };
  }

  async patchProviderShortlistNote(
    accountId: string,
    actorUserId: string,
    providerId: string,
    note: string,
  ) {
    if (!Types.ObjectId.isValid(providerId)) {
      throw new BadRequestException('providerId inválido.');
    }

    const entry = await this.providerShortlistModel
      .findOne({
        accountId: new Types.ObjectId(accountId),
        providerId: new Types.ObjectId(providerId),
      })
      .exec();

    if (!entry) {
      throw new NotFoundException('Entrada de shortlist no encontrada.');
    }

    const n = this.normalizeText(note);
    entry.note = n || undefined;
    entry.updatedByUserId = actorUserId;
    await entry.save();

    return { ok: true as const, note: entry.note };
  }

  async providerShortlistIds(accountId: string): Promise<string[]> {
    const rows = await this.providerShortlistModel
      .find({ accountId: new Types.ObjectId(accountId) })
      .select({ providerId: 1 })
      .lean()
      .exec();
    return rows.map((r) => String(r.providerId));
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
