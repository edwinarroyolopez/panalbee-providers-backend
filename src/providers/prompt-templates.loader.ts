import { promises as fs } from 'fs';
import { join } from 'path';

export type PromptTemplateReadOk = {
  content: string;
  source: string;
};

function sourceLabelFromPath(filePath: string, fileName: string): string {
  if (filePath.includes('backend-providers')) {
    return `backend-providers/docs/${fileName}`;
  }
  if (filePath.includes('web-providers')) {
    return `web-providers/docs/${fileName}`;
  }
  return `docs/${fileName}`;
}

/**
 * Candidate paths for markdown prompt templates. Order matters: env override first,
 * then cwd-relative (works in Docker when /app/docs exists), then dist bundle,
 * then monorepo / legacy layouts.
 */
export function buildPromptCandidatePaths(fileName: string): string[] {
  const envDir = process.env.PROVIDER_PROMPTS_DIR?.trim();
  const paths: string[] = [];

  if (envDir) {
    paths.push(join(envDir, fileName));
  }

  paths.push(
    join(process.cwd(), 'docs', fileName),
    join(process.cwd(), 'dist', 'docs', fileName),
    join(process.cwd(), 'backend-providers', 'docs', fileName),
    join(process.cwd(), '..', 'backend-providers', 'docs', fileName),
    join(process.cwd(), '..', 'web-providers', 'docs', fileName),
    join(process.cwd(), 'web-providers', 'docs', fileName),
    join(process.cwd(), '..', 'docs', fileName),
    join(process.cwd(), 'legacy-docs', fileName),
  );

  return paths;
}

/**
 * Reads the first existing prompt file from candidate paths.
 * Returns null if none exist (no exception).
 */
export async function readPromptTemplateIfPresent(
  fileName: string,
): Promise<PromptTemplateReadOk | null> {
  const candidates = buildPromptCandidatePaths(fileName);

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate, 'utf8');
      return {
        content,
        source: sourceLabelFromPath(candidate, fileName),
      };
    } catch {
      // try next
    }
  }

  return null;
}

export function missingTemplateMessage(
  fileName: string,
  candidates: string[],
): string {
  return `Plantilla ${fileName} no encontrada en el servidor. Rutas probadas: ${candidates.join(', ')}`;
}

export type ScrapingPromptTemplatesPayload = {
  scrapingPrompt?: string;
  zipPrompt?: string;
  availability: { scrapingPrompt: boolean; zipPrompt: boolean };
  sources: { scrapingPrompt?: string; zipPrompt?: string };
  errors?: { scrapingPrompt?: string; zipPrompt?: string };
};

/**
 * Builds the API payload from two optional template reads (partial success allowed).
 */
export function composeScrapingPromptTemplatesPayload(
  scrapingFile: string,
  zipFile: string,
  scrapingPromptDoc: PromptTemplateReadOk | null,
  zipPromptDoc: PromptTemplateReadOk | null,
): ScrapingPromptTemplatesPayload {
  const scrapingPrompt = scrapingPromptDoc?.content;
  const zipPrompt = zipPromptDoc?.content;

  const availability = {
    scrapingPrompt: Boolean(scrapingPrompt && scrapingPrompt.trim()),
    zipPrompt: Boolean(zipPrompt && zipPrompt.trim()),
  };

  const errors: { scrapingPrompt?: string; zipPrompt?: string } = {};

  if (!availability.scrapingPrompt) {
    errors.scrapingPrompt = missingTemplateMessage(
      scrapingFile,
      buildPromptCandidatePaths(scrapingFile),
    );
  }
  if (!availability.zipPrompt) {
    errors.zipPrompt = missingTemplateMessage(
      zipFile,
      buildPromptCandidatePaths(zipFile),
    );
  }

  return {
    scrapingPrompt,
    zipPrompt,
    availability,
    sources: {
      scrapingPrompt: scrapingPromptDoc?.source,
      zipPrompt: zipPromptDoc?.source,
    },
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };
}
