import { describe, it, expect, vi } from 'vitest';

// clusters() tests `typeof Intl.Segmenter`, which throws a ReferenceError when
// the engine has no Intl object at all (Node built --without-intl, QuickJS,
// some embedded engines). encode() then throws instead of using the
// per-code-point fallback that the README promises.
describe('regression: encode() in an engine without Intl', () => {
  it('falls back to one cluster per code point', async () => {
    vi.resetModules();
    const fresh = (await import('../../../src/index')).default;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Intl') as PropertyDescriptor;
    Reflect.deleteProperty(globalThis, 'Intl');
    let result: string;
    try {
      result = fresh.encode('SOS');
    } catch (err) {
      result = `threw: ${String(err)}`;
    } finally {
      Object.defineProperty(globalThis, 'Intl', descriptor);
      vi.resetModules();
    }
    // Observed: 'threw: ReferenceError: Intl is not defined'. Expected: '... --- ...'.
    expect(result).toBe('... --- ...');
  });
});
