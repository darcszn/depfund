import * as path from 'path';
import * as fs from 'fs';
import { detectEcosystem, parseDependencies } from './parsers/index.js';
import { fetchAllFunding } from './fetcher.js';
import type { ScanResult, ScanOptions, Ecosystem } from './types.js';

export async function scan(
  options: ScanOptions,
  onProgress?: (done: number, total: number) => void
): Promise<ScanResult> {
  const dir = process.cwd();
  let filePath: string;
  let ecosystem: Ecosystem;

  if (options.file) {
    filePath = path.resolve(options.file);
    ecosystem = options.ecosystem || inferEcosystem(filePath);
  } else {
    const detected = detectEcosystem(dir);
    if (!detected) {
      throw new Error(
        'No supported manifest file found. Run depfund in a directory with ' +
          'package.json, requirements.txt, pyproject.toml, or Cargo.toml'
      );
    }
    filePath = detected.filePath;
    ecosystem = detected.ecosystem;
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const rawDeps = parseDependencies(
    filePath,
    ecosystem,
    options.includeTransitive
  );

  if (rawDeps.length === 0) {
    throw new Error('No dependencies found in manifest file.');
  }

  const fundedDeps = await fetchAllFunding(rawDeps, onProgress);

  const funded = fundedDeps.filter((d) => d.hasFunding);
  const unfunded = fundedDeps.filter((d) => !d.hasFunding);

  // Try to get project name from manifest
  let projectName = path.basename(path.dirname(filePath));
  try {
    if (filePath.endsWith('package.json')) {
      const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (pkg.name) projectName = pkg.name;
    }
  } catch {
    /* ignore */
  }

  return {
    projectName,
    ecosystem,
    scannedAt: new Date().toISOString(),
    totalDependencies: fundedDeps.length,
    fundedCount: funded.length,
    unfundedCount: unfunded.length,
    dependencies: fundedDeps,
  };
}

function inferEcosystem(filePath: string): Ecosystem {
  const base = path.basename(filePath);
  if (base === 'package.json') return 'npm';
  if (base === 'requirements.txt' || base === 'pyproject.toml') return 'pypi';
  if (base === 'Cargo.toml') return 'crates';
  return 'unknown';
}
