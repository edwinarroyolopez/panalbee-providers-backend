/**
 * Normalización de filas de importación de proveedores (intake).
 * Mantener alineado con `web-providers/src/modules/providers/utils/provider-import-normalize.utils.ts`.
 */

import type { ImportProviderItem } from '../dto/import-providers.dto';

const INVISIBLE_RE = /[\u200B-\u200D\uFEFF\u00A0]/g;

export function stripInvisible(input: string): string {
  return input.replace(INVISIBLE_RE, ' ').replace(/\s+/g, ' ').trim();
}

export function cleanMarkdownAndJunk(raw: string): string {
  let s = stripInvisible(raw);
  const md = s.match(/\]\((https?:\/\/[^)\s]+)\)/i);
  if (md) {
    s = stripInvisible(md[1]);
  }
  s = s.replace(/^[`"'<\[\(]+|[`"'>\]\)]+$/g, '');
  return stripInvisible(s);
}

export function extractFirstHttpUrl(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s\])>\]"',]+/i);
  if (!m) return undefined;
  return stripInvisible(m[0].replace(/[)\].,;'"`]+$/g, ''));
}

/** Clave estable para intake/dedupe (sin protocolo, minúsculas). */
export function normalizeWebsiteKey(input?: string | null): string | undefined {
  if (input == null) return undefined;
  const raw = String(input);
  let s = cleanMarkdownAndJunk(raw);
  const extracted = extractFirstHttpUrl(s);
  if (extracted) s = extracted;
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  s = s.replace(/\/$/, '');
  s = stripInvisible(s.replace(/[)\].,;]+$/g, ''));
  if (!s) return undefined;
  return s.toLowerCase();
}

function hostPathComparable(urlish: string): string {
  const t = stripInvisible(urlish).toLowerCase();
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.replace(/^www\./i, '');
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return t.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  }
}

function instagramFromCleaned(s: string): string | undefined {
  let v = cleanMarkdownAndJunk(s);
  const extracted = extractFirstHttpUrl(v);
  if (extracted) v = extracted;
  v = stripInvisible(v.replace(/^@+/, ''));
  if (!v) return undefined;

  if (!/^https?:\/\//i.test(v)) {
    if (/instagram\.com|instagr\.am/i.test(v)) {
      v = /^\/\//.test(v) ? `https:${v}` : `https://${v.replace(/^\/+/, '')}`;
    } else {
      const handle = v.split(/[\s/]+/)[0]?.replace(/^@+/, '') ?? '';
      if (!handle) return undefined;
      v = `https://instagram.com/${handle}`;
    }
  }

  try {
    const u = new URL(v);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.includes('instagram') && !host.includes('instagr')) {
      return stripInvisible(v.toLowerCase());
    }
    const path = (u.pathname.replace(/\/+$/, '') || '').toLowerCase();
    return `https://${host}${path}`;
  } catch {
    return stripInvisible(v.toLowerCase());
  }
}

function facebookFromCleaned(s: string): string | undefined {
  let v = cleanMarkdownAndJunk(s);
  const extracted = extractFirstHttpUrl(v);
  if (extracted) v = extracted;
  v = stripInvisible(v.replace(/^@+/, ''));
  if (!v) return undefined;

  if (!/^https?:\/\//i.test(v)) {
    if (/facebook\.com|fb\.com/i.test(v)) {
      v = /^\/\//.test(v) ? `https:${v}` : `https://${v.replace(/^\/+/, '')}`;
    } else {
      const handle = v.split(/[\s/]+/)[0]?.replace(/^@+/, '') ?? '';
      if (!handle) return undefined;
      v = `https://www.facebook.com/${handle}`;
    }
  }

  try {
    const u = new URL(v);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.includes('facebook') && host !== 'fb.com' && !host.endsWith('.facebook.com')) {
      return stripInvisible(v.toLowerCase());
    }
    const path = u.pathname.replace(/\/+$/, '') || '';
    const origin = u.protocol === 'https:' ? `https://${u.hostname.toLowerCase()}` : u.origin.toLowerCase();
    return stripInvisible(`${origin}${path}`);
  } catch {
    return stripInvisible(v.toLowerCase());
  }
}

export function normalizeInstagramField(input?: string | null): string | undefined {
  if (input == null || input === '') return undefined;
  return instagramFromCleaned(String(input));
}

export function normalizeFacebookField(input?: string | null): string | undefined {
  if (input == null || input === '') return undefined;
  return facebookFromCleaned(String(input));
}

export function normalizePhoneField(input: string): string {
  let s = stripInvisible(input);
  s = s.replace(/[()\-.]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

/** Si `website` trae una URL de red social, promover al campo correcto. */
export function promoteMisplacedWebsiteRaw(raw?: string | null): {
  website?: string;
  instagram?: string;
  facebook?: string;
} {
  if (raw == null || !String(raw).trim()) return {};
  const s = cleanMarkdownAndJunk(String(raw));
  const lower = s.toLowerCase();
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return { instagram: instagramFromCleaned(s) };
  }
  if (lower.includes('facebook.com') || lower.includes('fb.com')) {
    return { facebook: facebookFromCleaned(s) };
  }
  return { website: s };
}

function dedupeContactFields(parts: {
  website?: string;
  instagram?: string;
  facebook?: string;
}): { website?: string; instagram?: string; facebook?: string } {
  const { website, instagram, facebook } = parts;
  const w = website;
  let ig = instagram;
  let fb = facebook;

  const cw = w ? hostPathComparable(w.includes('://') ? w : `https://${w}`) : undefined;
  const ci = ig ? hostPathComparable(ig) : undefined;
  const cf = fb ? hostPathComparable(fb) : undefined;

  if (ci && cw && ci === cw) {
    ig = undefined;
  }
  if (cf && cw && cf === cw) {
    fb = undefined;
  }
  if (ci && cf && ci === cf) {
    fb = undefined;
  }

  return { website: w, instagram: ig, facebook: fb };
}

export function normalizeKey(input?: string): string {
  return stripInvisible(input ?? '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function buildIntakeKey(parts: {
  name: string;
  country: string;
  website?: string;
}): string {
  const websiteKey = normalizeWebsiteKey(parts.website);
  if (websiteKey) return `web:${websiteKey}`;
  return `name:${normalizeKey(parts.name)}|country:${normalizeKey(parts.country)}`;
}

/**
 * Limpia una fila entrante (JSON) antes de validación/persistencia.
 * Omite opcionales vacíos; no introduce `null`.
 */
export function normalizeProviderImportRow(item: ImportProviderItem): ImportProviderItem {
  const name = stripInvisible(item.name ?? '');
  const category = stripInvisible(item.category ?? '');
  const country = stripInvisible(item.country ?? '');

  let city = item.city != null ? stripInvisible(String(item.city)) : '';
  city = city || '';

  const phonesRaw = Array.isArray(item.phones) ? item.phones : [];
  const phones = Array.from(
    new Set(phonesRaw.map((p) => normalizePhoneField(String(p))).filter(Boolean)),
  );

  const pw = promoteMisplacedWebsiteRaw(item.website);
  const instagram =
    normalizeInstagramField(item.instagram) ?? pw.instagram ?? undefined;
  const facebook = normalizeFacebookField(item.facebook) ?? pw.facebook ?? undefined;

  let website: string | undefined;
  if (pw.website != null && pw.website.trim()) {
    website = normalizeWebsiteKey(pw.website);
  } else if (pw.instagram ?? pw.facebook) {
    website = undefined;
  } else {
    website = normalizeWebsiteKey(item.website);
  }

  const deduped = dedupeContactFields({ website, instagram, facebook });

  const address = item.address != null ? stripInvisible(String(item.address)) : '';
  const description = item.description != null ? stripInvisible(String(item.description)) : '';
  const internalNotes = item.internalNotes != null ? stripInvisible(String(item.internalNotes)) : '';

  const trustLevel =
    item.trustLevel === null || item.trustLevel === undefined
      ? undefined
      : Number.isFinite(Number(item.trustLevel))
        ? Math.min(100, Math.max(0, Math.round(Number(item.trustLevel))))
        : undefined;

  const out: ImportProviderItem = {
    name,
    category,
    country,
  };

  if (city) out.city = city;
  if (phones.length) out.phones = phones;
  if (deduped.instagram) out.instagram = deduped.instagram;
  if (deduped.facebook) out.facebook = deduped.facebook;
  if (deduped.website) out.website = deduped.website;
  if (address) out.address = address;
  if (description) out.description = description;
  if (trustLevel !== undefined) out.trustLevel = trustLevel;
  if (internalNotes) out.internalNotes = internalNotes;

  return out;
}
