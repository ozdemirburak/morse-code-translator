import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

// The consumer-facing contract of the package as `npm pack` publishes it. The
// test copies the project into a temporary folder, runs the real `npm run
// build` script there and asks `npm pack --dry-run` for the file list, so a
// broken build script, a missing file or a stale dist/ cannot slip through.
const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
let copy = '';
let packed: string[] = [];

const npm = (...args: string[]) =>
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: copy, encoding: 'utf8', stdio: 'pipe' });
// A package path such as './dist/index.d.ts' inside the built copy.
const built = (path: string) => join(copy, path);
const published = (path: string) => packed.includes(path.replace(/^\.\//, ''));

beforeAll(() => {
  copy = mkdtempSync(join(tmpdir(), 'morse-package-'));
  for (const entry of ['src', 'test', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.test.json', 'vite.config.ts', '.npmrc', 'README.md', 'LICENSE']) {
    cpSync(resolve(root, entry), join(copy, entry), { recursive: true });
  }
  symlinkSync(resolve(root, 'node_modules'), join(copy, 'node_modules'), 'junction');
  npm('run', 'build');
  packed = JSON.parse(npm('pack', '--dry-run', '--json', '--ignore-scripts'))[0].files.map((file: { path: string }) => file.path);
}, 180_000);

afterAll(() => {
  if (copy) rmSync(copy, { recursive: true, force: true });
});

describe('package contract', () => {
  it('is ESM-only for Node and bundlers', () => {
    expect(pkg.type).toBe('module');
    // exports is the only entry point; no legacy main/module/types fields.
    expect([pkg.main, pkg.module, pkg.types]).toEqual([undefined, undefined, undefined]);
    expect(pkg.exports).toEqual({
      '.': { types: './dist/index.d.ts', default: './dist/morse-code-translator.es.js' },
      './package.json': './package.json',
    });
    expect(pkg.engines.node).toBe('>=22.12.0');
  });

  it('publishes exactly the built entry points, declarations and docs', () => {
    expect([...packed].sort()).toEqual(
      [
        'LICENSE',
        'README.md',
        'dist/index.d.ts',
        'dist/morse-code-translator.es.js',
        'dist/morse-code-translator.es.js.map',
        'dist/morse-code-translator.umd.js',
        'dist/morse-code-translator.umd.js.map',
        'dist/types.d.ts',
        'package.json',
      ].sort()
    );
    for (const path of [pkg.exports['.'].types, pkg.exports['.'].default, pkg.unpkg, pkg.jsdelivr]) {
      expect(published(path), path).toBe(true);
      expect(existsSync(built(path)), path).toBe(true);
    }
  });

  it('only imports published declaration files, with .js extensions', () => {
    for (const file of packed.filter((path) => path.endsWith('.d.ts'))) {
      const source = readFileSync(built(file), 'utf8');
      for (const [, specifier] of source.matchAll(/(?:from\s+|import\()\s*'(\.[^']*)'/g)) {
        // nodenext consumers need explicit extensions (TS2834 otherwise).
        expect(specifier, `${file} imports ${specifier}`).toMatch(/\.js$/);
        expect(published(`dist/${specifier.replace(/^\.\//, '').replace(/\.js$/, '.d.ts')}`), `${file} imports ${specifier}`).toBe(true);
      }
    }
  });

  it('can be require()d through require(esm) and leaks no global', () => {
    const script =
      `const m = require(${JSON.stringify(built(pkg.exports['.'].default))});` +
      `process.stdout.write(JSON.stringify([m.encode('SOS'), m.default.decode('... --- ...'), typeof globalThis.MorseCodeTranslator]));`;
    const output = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual(['... --- ...', 'SOS', 'undefined']);
  });

  it('defines the MorseCodeTranslator global in a browser-like script context', () => {
    const window: Record<string, { encode: (text: string) => string }> = {};
    runInNewContext(readFileSync(built(pkg.unpkg), 'utf8'), { window, self: window, globalThis: window });
    expect(window.MorseCodeTranslator.encode('SOS')).toBe('... --- ...');
  });

  it('ships declarations that reference the DOM lib', () => {
    expect(readFileSync(built('dist/types.d.ts'), 'utf8')).toMatch(/^\/\/\/ <reference lib="dom" preserve="true" \/>/);
  });
});
