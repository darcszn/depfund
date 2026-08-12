import * as fs from 'fs';
import * as path from 'path';
import type { RawDependency } from '../types.js';

interface CargoToml {
  package?: { name?: string; version?: string };
  dependencies?: Record<string, string | { version?: string; optional?: boolean }>;
  'dev-dependencies'?: Record<string, string | { version?: string }>;
  'build-dependencies'?: Record<string, string | { version?: string }>;
}

function extractVersion(val: string | { version?: string }): string {
  if (typeof val === 'string') return val.replace(/[^0-9.]/g, '');
  return val.version?.replace(/[^0-9.]/g, '') || 'unknown';
}

export function parseCrates(filePath: string): RawDependency[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const toml = require('toml');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed: CargoToml = toml.parse(raw);
  const deps: RawDependency[] = [];

  const addSection = (
    obj?: Record<string, string | { version?: string }>
  ) => {
    if (!obj) return;
    for (const [name, val] of Object.entries(obj)) {
      deps.push({ name, version: extractVersion(val), ecosystem: 'crates' });
    }
  };

  addSection(parsed.dependencies);
  addSection(parsed['dev-dependencies']);
  addSection(parsed['build-dependencies']);

  return deps;
}

export function detectCrates(dir: string): string | null {
  const candidate = path.join(dir, 'Cargo.toml');
  return fs.existsSync(candidate) ? candidate : null;
}
