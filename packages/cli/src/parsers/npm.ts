import * as fs from 'fs';
import * as path from 'path';
import type { RawDependency } from '../types.js';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function parseNpm(
  filePath: string,
  includeTransitive = false
): RawDependency[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const pkg: PackageJson = JSON.parse(raw);

  const deps: RawDependency[] = [];

  const addDeps = (obj?: Record<string, string>) => {
    if (!obj) return;
    for (const [name, version] of Object.entries(obj)) {
      deps.push({
        name,
        version: version.replace(/^[\^~>=<]/, '').split(' ')[0],
        ecosystem: 'npm',
      });
    }
  };

  addDeps(pkg.dependencies);
  addDeps(pkg.devDependencies);
  addDeps(pkg.peerDependencies);

  // If includeTransitive, try to read package-lock.json
  if (includeTransitive) {
    const lockPath = path.join(path.dirname(filePath), 'package-lock.json');
    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      const packages = lock.packages || lock.dependencies || {};
      for (const [pkgName, pkgData] of Object.entries(
        packages as Record<string, { version?: string }>
      )) {
        const cleanName = pkgName.replace(/^node_modules\//, '');
        if (cleanName && !deps.find((d) => d.name === cleanName)) {
          deps.push({
            name: cleanName,
            version: pkgData.version || 'unknown',
            ecosystem: 'npm',
          });
        }
      }
    }
  }

  return deps;
}

export function detectNpm(dir: string): string | null {
  const candidate = path.join(dir, 'package.json');
  return fs.existsSync(candidate) ? candidate : null;
}
