import * as fs from 'fs';
import * as path from 'path';
import type { RawDependency } from '../types.js';

// Parse a requirements.txt file
export function parsePypi(filePath: string): RawDependency[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const deps: RawDependency[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip comments and empty lines
    if (!line || line.startsWith('#') || line.startsWith('-r')) continue;

    // Handle environment markers (e.g. "package; python_version >= '3.6'")
    const withoutMarker = line.split(';')[0].trim();

    // Extract name and version constraint
    const match = withoutMarker.match(/^([A-Za-z0-9_\-\.]+)([>=<!~^]+.*)? *$/);
    if (match) {
      const name = match[1].toLowerCase().replace(/_/g, '-');
      const versionRaw =
        match[2]?.replace(/[>=<!~^ ]/g, '').split(',')[0] || 'unknown';
      deps.push({ name, version: versionRaw, ecosystem: 'pypi' });
    }
  }

  return deps;
}

// Parse a pyproject.toml file dependencies
export function parsePyproject(filePath: string): RawDependency[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const toml = require('toml');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = toml.parse(raw);
  const deps: RawDependency[] = [];

  // PEP 621 style
  const projectDeps: string[] = parsed?.project?.dependencies || [];
  for (const dep of projectDeps) {
    const match = dep.match(/^([A-Za-z0-9_\-\.]+)/);
    if (match) {
      deps.push({
        name: match[1].toLowerCase().replace(/_/g, '-'),
        version: 'unknown',
        ecosystem: 'pypi',
      });
    }
  }

  // Poetry style
  const poetryDeps: Record<string, unknown> =
    parsed?.tool?.poetry?.dependencies || {};
  for (const [name, version] of Object.entries(poetryDeps)) {
    if (name === 'python') continue;
    deps.push({
      name: name.toLowerCase().replace(/_/g, '-'),
      version:
        typeof version === 'string'
          ? version.replace(/[^0-9.]/g, '')
          : 'unknown',
      ecosystem: 'pypi',
    });
  }

  return deps;
}

export function detectPypi(dir: string): string | null {
  for (const candidate of ['requirements.txt', 'pyproject.toml']) {
    const full = path.join(dir, candidate);
    if (fs.existsSync(full)) return full;
  }
  return null;
}
