// Shared types mirrored from CLI package
// These are duplicated here to avoid a hard dependency on the CLI in the web build

export type Ecosystem = 'npm' | 'pypi' | 'crates' | 'unknown';

export interface RawDependency {
  name: string;
  version: string;
  ecosystem: Ecosystem;
}

export interface FundingLink {
  type: string;
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

export interface ApiScanRequest {
  content: string;
  filename: string;
}

export interface ApiScanResponse {
  result?: ScanResult;
  error?: string;
}
