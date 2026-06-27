import { describe, expect, it } from 'vitest';
import { hasForeignScript } from '@/lib/ingest/translate';

describe('hasForeignScript', () => {
  it('is false for plain English', () => {
    expect(hasForeignScript("Mark Zuckerberg's private jet flew", 'Emitted 253 tonnes of CO2')).toBe(false);
  });

  it('ignores accented Latin (é, ñ, ü, ø, ç)', () => {
    expect(hasForeignScript('Beyoncé pledges in Málaga', 'Announced in São Paulo by François')).toBe(false);
  });

  it('detects non-Latin scripts', () => {
    expect(hasForeignScript('Газпром строит', '')).toBe(true); // Cyrillic
    expect(hasForeignScript('الطائرة الخاصة')).toBe(true); // Arabic
    expect(hasForeignScript('私用ジェット')).toBe(true); // CJK + Katakana
    expect(hasForeignScript('전용기')).toBe(true); // Hangul
    expect(hasForeignScript('เครื่องบินส่วนตัว')).toBe(true); // Thai
    expect(hasForeignScript('מטוס פרטי')).toBe(true); // Hebrew
  });

  it('detects foreign script in the summary even when the title is English', () => {
    expect(hasForeignScript('Private jet report', 'Бортовой журнал')).toBe(true);
  });

  it('skips null/undefined fields safely', () => {
    expect(hasForeignScript(null, undefined, 'clean english')).toBe(false);
  });
});
