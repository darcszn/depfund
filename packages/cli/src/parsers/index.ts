import { detectNpm, parseNpm } from './npm.js';
import { detectPypi, parsePypi, parsePyproject } from './pypi.js';
import { detectCrates, parseCrates } from './crates.js';
import type { Ecosystem, RawDependency } from '../types.js';

export interface DetectedProject {
  filePath: string;
  ecosystem: Ecosystem;
}

export function detectEcosystem(dir: string): DetectedProject | null {
  const npmFile = detectNpm(dir);
  if (npmFile) return { filePath: npmFile, ecosystem: 'npm' };

  const pyFile = detectPypi(dir);
  if (pyFile) return { filePath: pyFile, ecosystem: 'pypi' };

  const cratesFile = detectCrates(dir);
  if (cratesFile) return { filePath: cratesFile, ecosystem: 'crates' };

  return null;
}

export function parseDependencies(
  filePath: string,
  ecosystem: Ecosystem,
  includeTransitive = false
): RawDependency[] {
  switch (ecosystem) {
    case 'npm':
      return parseNpm(filePath, includeTransitive);
    case 'pypi':
      return filePath.endsWith('pyproject.toml')
        ? parsePyproject(filePath)
        : parsePypi(filePath);
    case 'crates':
      return parseCrates(filePath);
    default:
      throw new Error(`Unsupported ecosystem: ${ecosystem}`);
  }
}
