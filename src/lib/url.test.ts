import { describe, expect, it } from 'vitest';
import { safeHref } from '@/lib/url';

describe('safeHref', () => {
  it('passes http and https through unchanged', () => {
    expect(safeHref('https://example.com/article')).toBe('https://example.com/article');
    expect(safeHref('http://x.com')).toBe('http://x.com');
  });
  it('neutralises dangerous or missing schemes to #', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref('  javascript:alert(1)')).toBe('#'); // leading whitespace
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#');
    expect(safeHref('//evil.com')).toBe('#');
    expect(safeHref('')).toBe('#');
    expect(safeHref(null)).toBe('#');
    expect(safeHref(undefined)).toBe('#');
  });
});
