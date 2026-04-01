/**
 * Parseo de intelligence embebida en `internalNotes` (línea intel: o intel_json:).
 * Mantener alineado con `web-providers/src/modules/providers/utils/provider-intel-parse.utils.ts`.
 */

export type ProviderResearchRecommendation =
  | 'priorizar_para_panalbee'
  | 'priorizar_para_growth'
  | 'priorizar_para_ambos'
  | 'revisar_manual'
  | 'descartar';

export type ParsedProviderIntel = {
  recommendation: ProviderResearchRecommendation;
  scores: {
    dataQualityScore?: number;
    supplyFitScore?: number;
    commerceReadinessScore?: number;
    growthOpportunityScore?: number;
    confidenceScore?: number;
  };
  rationale?: string;
  /** Códigos normalizados (snake_case). */
  frictions: string[];
  nextStepCode?: string;
  /** Tokens de señales opcionales (web_no, ig_si, …). */
  signalTokens: string[];
};

const RECOMMENDATIONS: ProviderResearchRecommendation[] = [
  'priorizar_para_panalbee',
  'priorizar_para_growth',
  'priorizar_para_ambos',
  'revisar_manual',
  'descartar',
];

function normalizeRec(raw: string): ProviderResearchRecommendation | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_');
  const hit = RECOMMENDATIONS.find((r) => r === t);
  return hit ?? null;
}

function parseIntScore(v: string): number | undefined {
  const n = Number.parseInt(v.replace(/\D/g, ''), 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

function splitCsv(s: string): string[] {
  return s
    .split(/[,;|]/)
    .map((x) => x.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

function parsePipePayload(payload: string): ParsedProviderIntel | null {
  const segments = payload.split('|').map((s) => s.trim()).filter(Boolean);
  const map: Record<string, string> = {};
  for (const seg of segments) {
    const eq = seg.indexOf('=');
    if (eq <= 0) continue;
    const key = seg.slice(0, eq).trim().toLowerCase();
    let val = seg.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1).trim();
    }
    map[key] = val;
  }

  const recRaw = map.rec ?? map.recomendacion ?? map.recommendation;
  if (!recRaw) return null;
  const recommendation = normalizeRec(recRaw);
  if (!recommendation) return null;

  const scores: ParsedProviderIntel['scores'] = {};
  if (map.dq) scores.dataQualityScore = parseIntScore(map.dq);
  if (map.sf) scores.supplyFitScore = parseIntScore(map.sf);
  if (map.cr) scores.commerceReadinessScore = parseIntScore(map.cr);
  if (map.go) scores.growthOpportunityScore = parseIntScore(map.go);
  if (map.conf) scores.confidenceScore = parseIntScore(map.conf);

  const rationale = map.why ?? map.porque ?? map.rationale;
  const frictionRaw = map.friction ?? map.fricciones ?? map.friccion ?? '';
  const frictions = frictionRaw ? splitCsv(frictionRaw) : [];
  const nextStepCode = (map.next ?? map.proximo ?? map.siguiente ?? '').trim() || undefined;
  const signalRaw = map.signals ?? map.senales ?? map.senal ?? '';
  const signalTokens = signalRaw ? splitCsv(signalRaw) : [];

  return {
    recommendation,
    scores,
    rationale: rationale?.trim() || undefined,
    frictions,
    nextStepCode,
    signalTokens,
  };
}

function tryParseJsonLine(line: string): ParsedProviderIntel | null {
  const m = line.match(/^\s*intel_json:\s*(.+)$/i);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]) as Record<string, unknown>;
    const rec = normalizeRec(String(data.recommendation ?? data.rec ?? ''));
    if (!rec) return null;
    const scoresObj = (data.scores ?? {}) as Record<string, unknown>;
    const scores: ParsedProviderIntel['scores'] = {
      dataQualityScore: parseIntScore(String(scoresObj.dataQualityScore ?? scoresObj.dq ?? '')),
      supplyFitScore: parseIntScore(String(scoresObj.supplyFitScore ?? scoresObj.sf ?? '')),
      commerceReadinessScore: parseIntScore(
        String(scoresObj.commerceReadinessScore ?? scoresObj.cr ?? ''),
      ),
      growthOpportunityScore: parseIntScore(
        String(scoresObj.growthOpportunityScore ?? scoresObj.go ?? ''),
      ),
      confidenceScore: parseIntScore(String(scoresObj.confidenceScore ?? scoresObj.conf ?? '')),
    };
    Object.keys(scores).forEach((k) => {
      if (scores[k as keyof typeof scores] === undefined) {
        delete scores[k as keyof typeof scores];
      }
    });
    const frictions = Array.isArray(data.frictions)
      ? (data.frictions as unknown[]).map((x) => String(x).toLowerCase().replace(/\s+/g, '_'))
      : typeof data.frictions === 'string'
        ? splitCsv(data.frictions)
        : [];
    const signalTokens = Array.isArray(data.signalTokens)
      ? (data.signalTokens as unknown[]).map((x) => String(x).toLowerCase().replace(/\s+/g, '_'))
      : typeof data.signals === 'string'
        ? splitCsv(data.signals)
        : [];

    return {
      recommendation: rec,
      scores,
      rationale: data.recommendationRationale
        ? String(data.recommendationRationale)
        : data.why
          ? String(data.why)
          : undefined,
      frictions,
      nextStepCode: data.nextStepCode ? String(data.nextStepCode) : undefined,
      signalTokens,
    };
  } catch {
    return null;
  }
}

export function parseIntelFromInternalNotes(notes?: string | null): ParsedProviderIntel | null {
  if (!notes?.trim()) return null;
  const lines = notes.split('\n');

  for (const line of lines) {
    const j = tryParseJsonLine(line);
    if (j) return j;
  }

  const intelLine = lines.find((l) => /^\s*intel:/i.test(l));
  if (!intelLine) return null;
  const payload = intelLine.replace(/^\s*intel:\s*/i, '').trim();
  if (!payload) return null;
  return parsePipePayload(payload);
}

export function intelGrowthSortScore(parsed: ParsedProviderIntel | null): number | null {
  if (!parsed) return null;
  const go = parsed.scores.growthOpportunityScore;
  if (go != null && Number.isFinite(go)) return go;
  return null;
}
