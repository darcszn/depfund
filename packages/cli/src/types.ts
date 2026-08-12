export type Ecosystem = 'npm' | 'pypi' | 'crates' | 'unknown';

export interface RawDependency {
  name: string;
  version: string;
  ecosystem: Ecosystem;
}

export interface FundingLink {
  type: string; // 'github', 'patreon', 'opencollective', 'ko_fi', 'custom', etc.
  url: string;
}

export interface FundedDependency {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  description?: string;
  repositoryUrl?: string;
  funding: FundingLink[];
  hasFunding: boolean;
}

export interface ScanResult {
  projectName: string;
  ecosystem: Ecosystem;
  scannedAt: string;
  totalDependencies: number;
  fundedCount: number;
  unfundedCount: number;
  dependencies: FundedDependency[];
}

export interface ScanOptions {
  file?: string;
  ecosystem?: Ecosystem;
  json?: boolean;
  markdown?: boolean;
  output?: string;
  includeTransitive?: boolean;
}
