import { describe, it, expect } from 'vitest';

describe('i18n Translations', () => {
  it('should have matching keys in en and ar files', async () => {
    const en = await import('./en.js');
    const ar = await import('./ar.js');
    
    const enKeys = Object.keys(en.default);
    const arKeys = Object.keys(ar.default);
    
    // Check that all top-level keys exist in both
    expect(arKeys).toContain('common');
    expect(arKeys).toContain('settings');
    expect(arKeys).toContain('animals');
    expect(arKeys).toContain('devices');
  });

  it('should have settings section with required keys', async () => {
    const ar = await import('./ar.js');
    const settings = ar.default.settings;
    
    expect(settings).toHaveProperty('title');
    expect(settings).toHaveProperty('general');
    expect(settings).toHaveProperty('smtp');
    expect(settings).toHaveProperty('languages');
    expect(settings).toHaveProperty('roles');
  });
});
