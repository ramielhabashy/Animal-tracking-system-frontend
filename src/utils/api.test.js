import { describe, it, expect } from 'vitest';
import api, { getAuthHeaders, apiFetch } from './api';

describe('API Utility', () => {
  it('should export apiFetch function', () => {
    expect(typeof apiFetch).toBe('function');
  });

  it('should have getAuthHeaders function', () => {
    expect(typeof getAuthHeaders).toBe('function');
  });

  it('should have api object with methods', () => {
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.delete).toBe('function');
  });
});
