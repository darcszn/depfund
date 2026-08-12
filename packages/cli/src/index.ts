export { scan } from './scanner.js';
export { fetchFundingData, fetchAllFunding } from './fetcher.js';
export { parseDependencies, detectEcosystem } from './parsers/index.js';
export { toJson, toMarkdown } from './reporter.js';
export type {
  Ecosystem,
  RawDependency,
  FundingLink,
  FundedDependency,
  ScanResult,
  ScanOptions,
} from './types.js';
