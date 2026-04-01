import {
  cleanMarkdownAndJunk,
  normalizeProviderImportRow,
  normalizeWebsiteKey,
} from './provider-import-normalize';
import type { ImportProviderItem } from '../dto/import-providers.dto';

describe('provider-import-normalize', () => {
  it('strips markdown links and junk from URLs', () => {
    expect(cleanMarkdownAndJunk('[sitio](https://example.com/path)')).toBe('https://example.com/path');
    expect(normalizeWebsiteKey('Ver https://Foo.COM/bar/)')).toBe('foo.com/bar');
  });

  it('promotes instagram URL misplaced in website', () => {
    const row = normalizeProviderImportRow({
      name: 'Acme',
      category: 'ropa',
      country: 'Colombia',
      website: 'https://instagram.com/acmebrand',
    } as ImportProviderItem);
    expect(row.website).toBeUndefined();
    expect(row.instagram).toContain('instagram.com/acmebrand');
  });

  it('dedupes identical social URLs', () => {
    const url = 'https://www.facebook.com/acmebrand';
    const row = normalizeProviderImportRow({
      name: 'X',
      category: 'y',
      country: 'CO',
      instagram: url,
      facebook: url,
    } as ImportProviderItem);
    expect(row.facebook).toBeUndefined();
    expect(row.instagram).toContain('facebook.com');
  });

  it('omits empty optionals and null-like trust', () => {
    const row = normalizeProviderImportRow({
      name: ' A ',
      category: ' cat ',
      country: ' CO ',
      city: '',
      phones: [' +57 300 ', '+57 300'],
      trustLevel: undefined,
    } as ImportProviderItem);
    expect(row.name).toBe('A');
    expect(row.phones).toEqual(['+57 300']);
    expect('city' in row).toBe(false);
    expect('trustLevel' in row).toBe(false);
  });
});
