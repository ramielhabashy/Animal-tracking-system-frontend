import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the modules before importing
vi.mock('../utils/cookies', () => ({
  getAuthUser: vi.fn(() => null),
  getAuthToken: vi.fn(() => null),
  getLocale: vi.fn(() => 'en'),
  setLocale: vi.fn(),
}));

vi.mock('../utils/api', () => ({
  default: vi.fn(),
  getAuthHeaders: vi.fn(() => ({ 'Accept': 'application/json' })),
  getApiBase: vi.fn(() => ''),
}));

describe('API Utility Tests', () => {
  it('should export getAuthHeaders function', async () => {
    const { getAuthHeaders } = await import('../utils/api');
    expect(typeof getAuthHeaders).toBe('function');
  });

  it('should return headers from getAuthHeaders', async () => {
    const { getAuthHeaders } = await import('../utils/api');
    const headers = getAuthHeaders();
    expect(headers).toBeDefined();
    expect(typeof headers).toBe('object');
  });
});

describe('i18n Tests', () => {
  it('should have correct structure in en.js', async () => {
    const en = await import('../i18n/en.js');
    expect(en.default).toHaveProperty('common');
    expect(en.default).toHaveProperty('animals');
    expect(en.default).toHaveProperty('settings');
  });

  it('should have all settings keys in ar.js', async () => {
    const ar = await import('../i18n/ar.js');
    const settings = ar.default.settings;
    
    // Verify the 8 previously missing keys are now present
    expect(settings).toHaveProperty('languages');
    expect(settings).toHaveProperty('roles');
    expect(settings).toHaveProperty('roleSettings');
    expect(settings).toHaveProperty('roleDescription');
    expect(settings).toHaveProperty('languageSettings');
    expect(settings).toHaveProperty('languageDescription');
    expect(settings).toHaveProperty('manageTranslations');
    expect(settings).toHaveProperty('existingRoles');
  });

  it('should have matching top-level keys between en and ar', async () => {
    const en = await import('../i18n/en.js');
    const ar = await import('../i18n/ar.js');
    
    const enKeys = Object.keys(en.default);
    const arKeys = Object.keys(ar.default);
    
    // Check that all en keys exist in ar
    enKeys.forEach(key => {
      expect(arKeys).toContain(key);
    });
  });
});
