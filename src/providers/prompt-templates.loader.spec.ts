import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildPromptCandidatePaths,
  composeScrapingPromptTemplatesPayload,
  readPromptTemplateIfPresent,
} from './prompt-templates.loader';

describe('prompt-templates.loader', () => {
  describe('buildPromptCandidatePaths', () => {
    it('places PROVIDER_PROMPTS_DIR first when set', () => {
      const prev = process.env.PROVIDER_PROMPTS_DIR;
      const base = path.join(os.tmpdir(), 'pb-prompts-base');
      process.env.PROVIDER_PROMPTS_DIR = base;
      try {
        const paths = buildPromptCandidatePaths('f.md');
        expect(paths[0]).toBe(path.join(base, 'f.md'));
      } finally {
        if (prev === undefined) delete process.env.PROVIDER_PROMPTS_DIR;
        else process.env.PROVIDER_PROMPTS_DIR = prev;
      }
    });

    it('includes dist/docs relative to cwd', () => {
      const paths = buildPromptCandidatePaths('x.md');
      expect(paths).toContain(path.join(process.cwd(), 'dist', 'docs', 'x.md'));
    });
  });

  describe('readPromptTemplateIfPresent', () => {
    it('reads from PROVIDER_PROMPTS_DIR when file exists', async () => {
      const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pb-prompt-'));
      const fileName = 'prompt-scrapear-productos.md';
      const full = path.join(dir, fileName);
      await fs.promises.writeFile(full, 'template-body', 'utf8');

      const prev = process.env.PROVIDER_PROMPTS_DIR;
      process.env.PROVIDER_PROMPTS_DIR = dir;
      try {
        const got = await readPromptTemplateIfPresent(fileName);
        expect(got?.content).toBe('template-body');
        expect(got?.source).toBeDefined();
      } finally {
        await fs.promises.rm(dir, { recursive: true, force: true });
        if (prev === undefined) delete process.env.PROVIDER_PROMPTS_DIR;
        else process.env.PROVIDER_PROMPTS_DIR = prev;
      }
    });

    it('composeScrapingPromptTemplatesPayload allows partial success', () => {
      const scrapingFile = 'prompt-scrapear-productos.md';
      const zipFile = 'prompt-scrapear-productos-zip.md';
      const res = composeScrapingPromptTemplatesPayload(
        scrapingFile,
        zipFile,
        { content: 'json', source: 's1' },
        null,
      );
      expect(res.availability.scrapingPrompt).toBe(true);
      expect(res.availability.zipPrompt).toBe(false);
      expect(res.errors?.zipPrompt).toBeDefined();
      expect(res.errors?.scrapingPrompt).toBeUndefined();
    });

    it('composeScrapingPromptTemplatesPayload omits errors when both present', () => {
      const res = composeScrapingPromptTemplatesPayload(
        'a.md',
        'b.md',
        { content: 'x', source: 'sa' },
        { content: 'y', source: 'sb' },
      );
      expect(res.errors).toBeUndefined();
      expect(res.availability.scrapingPrompt).toBe(true);
      expect(res.availability.zipPrompt).toBe(true);
    });

    it('returns null when file is missing everywhere', async () => {
      const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pb-empty-'));
      const prev = process.env.PROVIDER_PROMPTS_DIR;
      process.env.PROVIDER_PROMPTS_DIR = dir;
      try {
        const got = await readPromptTemplateIfPresent('nonexistent-prompt.md');
        expect(got).toBeNull();
      } finally {
        await fs.promises.rm(dir, { recursive: true, force: true });
        if (prev === undefined) delete process.env.PROVIDER_PROMPTS_DIR;
        else process.env.PROVIDER_PROMPTS_DIR = prev;
      }
    });
  });
});
