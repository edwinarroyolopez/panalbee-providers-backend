import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Provider, ProviderDocument } from './schemas/provider.schema';
import {
  ProviderDecision,
  ProviderDecisionDocument,
} from './schemas/provider-decision.schema';
import { ImportProviderItem, ImportProvidersDto } from './dto/import-providers.dto';
import { ListProvidersQueryDto } from './dto/list-providers.dto';
import { ChangeProviderStateDto } from './dto/change-provider-state.dto';
import { ProviderDecisionType, ProviderStatus } from './providers.types';

type ImportValidationError = {
  index: number;
  field: string;
  message: string;
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
  ) {}

  private normalizeText(input?: string): string {
    return (input ?? '').trim();
  }

  private normalizeKey(input?: string): string {
    return this.normalizeText(input).toLowerCase().replace(/\s+/g, '_');
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

  private async validateImportPayload(dto: ImportProvidersDto): Promise<{
    normalized: NormalizedProviderInput[];
    errors: ImportValidationError[];
  }> {
    const normalized = dto.providers.map((item) => this.normalizeImportItem(item));
    const errors: ImportValidationError[] = [];

    const keyToIndexes = new Map<string, number[]>();

    normalized.forEach((item, index) => {
      if (!item.name) {
        errors.push({ index, field: 'name', message: 'El nombre es obligatorio.' });
      }

      if (!item.mainCategory) {
        errors.push({
          index,
          field: 'category',
          message: 'La categoria principal es obligatoria.',
        });
      }

      if (!item.country) {
        errors.push({
          index,
          field: 'country',
          message: 'El pais es obligatorio.',
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
          message: 'Proveedor duplicado dentro del mismo archivo.',
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
          message: 'Proveedor ya registrado previamente.',
        });
      }
    });

    return { normalized, errors };
  }

  async validateImport(dto: ImportProvidersDto) {
    const { errors, normalized } = await this.validateImportPayload(dto);

    return {
      valid: errors.length === 0,
      summary: {
        total: normalized.length,
        valid: errors.length === 0 ? normalized.length : 0,
        invalid: errors.length > 0 ? normalized.length : 0,
      },
      errors,
    };
  }

  async importProviders(dto: ImportProvidersDto, actorUserId: string) {
    const { errors, normalized } = await this.validateImportPayload(dto);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'El archivo JSON contiene errores de validacion.',
        errors,
      });
    }

    const now = new Date();

    const inserted = await this.providerModel.insertMany(
      normalized.map((item) => ({
        ...item,
        status: ProviderStatus.INGRESADO,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })),
    );

    return {
      insertedCount: inserted.length,
      providers: inserted,
    };
  }

  async listProviders(query: ListProvidersQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const categoryKey = this.normalizeKey(query.category);

    const filter: Record<string, unknown> = {};
    if (categoryKey) {
      filter.mainCategoryKey = categoryKey;
    }

    const [items, total, categories] = await Promise.all([
      this.providerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean()
        .exec(),
      this.providerModel.countDocuments(filter).exec(),
      this.providerModel.distinct('mainCategory').exec(),
    ]);

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
