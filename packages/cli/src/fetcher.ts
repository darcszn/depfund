import type { RawDependency, FundedDependency, FundingLink } from './types.js';

// Minimal fetch wrapper - Node 18+ has native fetch
const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'depfund-cli/0.1.0 (https://github.com/darcszn/depfund)',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
};

// ─── npm registry ─────────────────────────────────────────────────────────────

interface NpmPackage {
  description?: string;
  funding?:
    | { type: string; url: string }
    | { type: string; url: string }[];
  repository?: { url?: string } | string;
}

async function fetchNpmFunding(
  name: string
): Promise<Partial<FundedDependency>> {
  const data = await fetchJson<NpmPackage>(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/latest`
  );
  if (!data) return {};

  const funding: FundingLink[] = [];
  if (data.funding) {
    const raw = Array.isArray(data.funding) ? data.funding : [data.funding];
    for (const f of raw) {
      if (f.url) funding.push({ type: f.type || 'custom', url: f.url });
    }
  }

  let repoUrl: string | undefined;
  if (typeof data.repository === 'string') {
    repoUrl = data.repository;
  } else if (data.repository?.url) {
    repoUrl = data.repository.url
      .replace(/^git\+/, '')
      .replace(/\.git$/, '');
  }

  // Try GitHub FUNDING.yml if we have a GitHub repo
  if (repoUrl?.includes('github.com')) {
    const ghFunding = await fetchGitHubFunding(repoUrl);
    funding.push(...ghFunding);
  }

  return {
    description: data.description,
    repositoryUrl: repoUrl,
    funding: deduplicateFunding(funding),
  };
}

// ─── PyPI registry ────────────────────────────────────────────────────────────

interface PypiPackage {
  info?: {
    summary?: string;
    project_urls?: Record<string, string>;
    home_page?: string;
  };
}

async function fetchPypiFunding(
  name: string
): Promise<Partial<FundedDependency>> {
  const data = await fetchJson<PypiPackage>(
    `https://pypi.org/pypi/${encodeURIComponent(name)}/json`
  );
  if (!data?.info) return {};

  const funding: FundingLink[] = [];
  const projectUrls = data.info.project_urls || {};

  const fundingKeywords = [
    'funding',
    'donate',
    'sponsor',
    'patreon',
    'opencollective',
    'ko-fi',
    'liberapay',
  ];
  for (const [key, url] of Object.entries(projectUrls)) {
    const lk = key.toLowerCase();
    if (fundingKeywords.some((kw) => lk.includes(kw))) {
      funding.push({ type: detectFundingType(url), url });
    }
  }

  let repoUrl: string | undefined;
  const sourceUrl =
    projectUrls['Source'] ||
    projectUrls['Source Code'] ||
    projectUrls['Repository'] ||
    data.info.home_page;

  if (sourceUrl?.includes('github.com')) {
    repoUrl = sourceUrl;
    const ghFunding = await fetchGitHubFunding(sourceUrl);
    funding.push(...ghFunding);
  }

  return {
    description: data.info.summary,
    repositoryUrl: repoUrl,
    funding: deduplicateFunding(funding),
  };
}

// ─── crates.io registry ───────────────────────────────────────────────────────

interface CratesPackage {
  crate?: {
    description?: string;
    repository?: string;
    homepage?: string;
  };
}

async function fetchCratesFunding(
  name: string
): Promise<Partial<FundedDependency>> {
  const data = await fetchJson<CratesPackage>(
    `https://crates.io/api/v1/crates/${encodeURIComponent(name)}`
  );
  if (!data?.crate) return {};

  const funding: FundingLink[] = [];
  const repoUrl = data.crate.repository;

  if (repoUrl?.includes('github.com')) {
    const ghFunding = await fetchGitHubFunding(repoUrl);
    funding.push(...ghFunding);
  }

  return {
    description: data.crate.description,
    repositoryUrl: repoUrl,
    funding: deduplicateFunding(funding),
  };
}

// ─── GitHub FUNDING.yml ───────────────────────────────────────────────────────

interface FundingYmlKeys {
  github?: string | string[];
  patreon?: string;
  open_collective?: string;
  ko_fi?: string;
  tidelift?: string;
  liberapay?: string;
  custom?: string | string[];
}

async function fetchGitHubFunding(repoUrl: string): Promise<FundingLink[]> {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return [];

  const [, owner, repo] = match;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/.github/FUNDING.yml`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'depfund-cli/0.1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseFundingYml(text);
  } catch {
    return [];
  }
}

function parseFundingYml(text: string): FundingLink[] {
  const funding: FundingLink[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim() as keyof FundingYmlKeys;
    const value = line
      .slice(colonIdx + 1)
      .trim()
      .replace(/["'\[\]]/g, '');
    if (!value || value === 'null') continue;

    const values = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    for (const v of values) {
      switch (key) {
        case 'github':
          funding.push({
            type: 'github',
            url: `https://github.com/sponsors/${v}`,
          });
          break;
        case 'patreon':
          funding.push({ type: 'patreon', url: `https://patreon.com/${v}` });
          break;
        case 'open_collective':
          funding.push({
            type: 'opencollective',
            url: `https://opencollective.com/${v}`,
          });
          break;
        case 'ko_fi':
          funding.push({ type: 'ko_fi', url: `https://ko-fi.com/${v}` });
          break;
        case 'tidelift':
          funding.push({
            type: 'tidelift',
            url: `https://tidelift.com/subscription/pkg/${v}`,
          });
          break;
        case 'liberapay':
          funding.push({
            type: 'liberapay',
            url: `https://liberapay.com/${v}`,
          });
          break;
        case 'custom':
          funding.push({ type: 'custom', url: v });
          break;
      }
    }
  }

  return funding;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function detectFundingType(url: string): string {
  if (url.includes('github.com/sponsors')) return 'github';
  if (url.includes('patreon.com')) return 'patreon';
  if (url.includes('opencollective.com')) return 'opencollective';
  if (url.includes('ko-fi.com')) return 'ko_fi';
  if (url.includes('liberapay.com')) return 'liberapay';
  if (url.includes('tidelift.com')) return 'tidelift';
  return 'custom';
}

function deduplicateFunding(links: FundingLink[]): FundingLink[] {
  const seen = new Set<string>();
  return links.filter((l) => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

// ─── main exports ─────────────────────────────────────────────────────────────

export async function fetchFundingData(
  dep: RawDependency
): Promise<FundedDependency> {
  let extra: Partial<FundedDependency> = {};

  switch (dep.ecosystem) {
    case 'npm':
      extra = await fetchNpmFunding(dep.name);
      break;
    case 'pypi':
      extra = await fetchPypiFunding(dep.name);
      break;
    case 'crates':
      extra = await fetchCratesFunding(dep.name);
      break;
  }

  const funding = extra.funding || [];
  return {
    name: dep.name,
    version: dep.version,
    ecosystem: dep.ecosystem,
    description: extra.description,
    repositoryUrl: extra.repositoryUrl,
    funding,
    hasFunding: funding.length > 0,
  };
}

export async function fetchAllFunding(
  deps: RawDependency[],
  onProgress?: (done: number, total: number) => void
): Promise<FundedDependency[]> {
  const results: FundedDependency[] = [];
  const CONCURRENCY = 5;

  for (let i = 0; i < deps.length; i += CONCURRENCY) {
    const batch = deps.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((d) => fetchFundingData(d))
    );
    results.push(...batchResults);
    onProgress?.(Math.min(i + CONCURRENCY, deps.length), deps.length);
  }

  return results;
}
