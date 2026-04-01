import { parseIntelFromInternalNotes } from './provider-intel-parse';

describe('provider-intel-parse', () => {
  it('parses pipe intel line', () => {
    const notes = `foo\nintel: rec=priorizar_para_ambos | go=80 | dq=70 | why="Buen surtido, web floja" | friction=sin_sitio,catalogo_pobre | next=revisar_surtido`;
    const p = parseIntelFromInternalNotes(notes);
    expect(p?.recommendation).toBe('priorizar_para_ambos');
    expect(p?.scores.growthOpportunityScore).toBe(80);
    expect(p?.scores.dataQualityScore).toBe(70);
    expect(p?.rationale).toContain('Buen surtido');
    expect(p?.frictions).toContain('sin_sitio');
    expect(p?.nextStepCode).toBe('revisar_surtido');
  });

  it('returns null without intel', () => {
    expect(parseIntelFromInternalNotes('solo texto')).toBeNull();
  });
});
