import { describe, it, expect } from 'bun:test';
import { loadRules } from './rules';

describe('CLI', () => {
  it('should load rules', async () => {
    const categories = await loadRules();
    expect(Array.isArray(categories)).toBe(true);
  });
});
