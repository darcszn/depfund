import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiScanResponse,
  Ecosystem,
  FundedDependency,
  FundingLink,
  RawDependency,
  ScanResult,
} from '@/types';

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseNpm(content: string): RawDependency[] {
  const pkg = JSON.parse(content);
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
  return deps;
}

function parsePypi(content: string): RawDependency[] {
  const deps: RawDependency[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('-r')) continue;
    const withoutMarker = line.split(';')[0].trim();
    const match = withoutMarker.match(/^([A-Za-z0-9_\-\.]+)([>=<!~^]+.*)? *$/);
    if (match) {
      const name = match[1].toLowerCase().replace(/_/g, '-');
      const version =
        match[2]?.replace(/[>=<!~^ ]/g, '').split(',')[0] || 'unknown';
      deps.push({ name, version, ecosystem: 'pypi' });
    }
  }
  return deps;
}

function parseCrates(content: string): RawDependency[] {
  const deps: RawDependency[] = [];
  let inSection = false;
  let currentSection = '';

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Section headers
    if (line.startsWith('[')) {
      const sectionName = line.replace(/[\[\]]/g, '').trim();
      inSection =
        sectionName === 'dependencies' ||
        sectionName === 'dev-dependencies' ||
        sectionName === 'build-dependencies';
      currentSection = sectionName;
      continue;
    }

    if (!inSection || !line || line.startsWith('#')) continue;

    // Simple: name = "version" or name = { version = "..." }
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const name = line.slice(0, eqIdx).trim();
    const valRaw = line.slice(eqIdx + 1).trim();

    let version = 'unknown';
    if (valRaw.startsWith('"')) {
      version = valRaw.replace(/"/g, '').replace(/[^0-9.]/g, '');
    } else {
      const vMatch = valRaw.match(/version\s*=\s*"([^"]+)"/);
      if (vMatch) version = vMatch[1].replace(/[^0-9.]/g, '');
    }

    if (name && !name.includes('.')) {
      deps.push({ name, version, ecosystem: 'crates' });
    }
    void currentSection;
  }
  return deps;
}

function inferEcosystem(filename: string): Ecosystem {
  const base = filename.toLowerCase();
  if (base === 'package.json') return 'npm';
  if (base === 'requirements.txt' || base === 'pyproject.toml') return 'pypi';
  if (base === 'cargo.toml') return 'crates';
  return 'unknown';
}

function parseDependencies(content: string, filename: string): RawDependency[] {
  const ecosystem = inferEcosystem(filename);
  switch (ecosystem) {
    case 'npm':
      return parseNpm(content);
    case 'pypi':
      return parsePypi(content);
    case 'crates':
      return parseCrates(content);
    default:
      throw new Error(
        `Unsupported file: ${filename}. Use package.json, requirements.txt, or Cargo.toml`
      );
  }
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'depfund-web/0.1.0 (https://github.com/darcszn/depfund)',
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 }, // cache for 1 hour
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
};

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

function parseFundingYml(text: string): FundingLink[] {
  const funding: FundingLink[] = [];
  for (const line of text.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/["'\[\]]/g, '');
    if (!value || value === 'null') continue;
    const values = value.split(',').map((v) => v.trim()).filter(Boolean);
    for (const v of values) {
      switch (key) {
        case 'github':
          funding.push({ type: 'github', url: `https://github.com/sponsors/${v}` });
          break;
        case 'patreon':
          funding.push({ type: 'patreon', url: `https://patreon.com/${v}` });
          break;
        case 'open_collective':
          funding.push({ type: 'opencollective', url: `https://opencollective.com/${v}` });
          break;
        case 'ko_fi':
          funding.push({ type: 'ko_fi', url: `https://ko-fi.com/${v}` });
          break;
        case 'tidelift':
          funding.push({ type: 'tidelift', url: `https://tidelift.com/subscription/pkg/${v}` });
          break;
        case 'liberapay':
          funding.push({ type: 'liberapay', url: `https://liberapay.com/${v}` });
          break;
        case 'custom':
          funding.push({ type: 'custom', url: v });
          break;
      }
    }
  }
  return funding;
}

async function fetchGitHubFunding(repoUrl: string): Promise<FundingLink[]> {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) return [];
  const [, owner, repo] = match;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/.github/FUNDING.yml`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'depfund-web/0.1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return parseFundingYml(await res.text());
  } catch {
    return [];
  }
}

async function fetchNpmFunding(
  name: string
): Promise<Partial<FundedDependency>> {
  const data = await fetchJson<{
    description?: string;
    funding?: { type: string; url: string } | { type: string; url: string }[];
    repository?: { url?: string } | string;
  }>(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
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
    repoUrl = data.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
  }

  if (repoUrl?.includes('github.com')) {
    funding.push(...(await fetchGitHubFunding(repoUrl)));
  }

  return {
    description: data.description,
    repositoryUrl: repoUrl,
    funding: deduplicateFunding(funding),
  };
}

async function fetchPypiFunding(
  name: string
): Promise<Partial<FundedDependency>> {
  const data = await fetchJson<{
    info?: {
      summary?: string;
      project_urls?: Record<string, string>;
      home_page?: string;
    };
  }>(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  if (!data?.info) return {};

  const funding: FundingLink[] = [];
  const projectUrls = data.info.project_urls || {};
  const fundingKeywords = ['funding', 'donate', 'sponsor', 'patreon', 'opencollective', 'ko-fi', 'liberapay'];

  for (const [key, url] of Object.entries(projectUrls)) {
    if (fundingKeywords.some((kw) => key.toLowerCase().includes(kw))) {
      funding.push({ type: detectFundingType(url), url });
    }
  }

  const sourceUrl =
    projectUrls['Source'] || projectUrls['Source Code'] || projectUrls['Repository'] || data.info.home_page;

  let repoUrl: string | undefined;
  if (sourceUrl?.includes('github.com')) {
    repoUrl = sourceUrl;
    funding.push(...(await fetchGitHubFunding(sourceUrl)));
  }

  return {
    description: data.info.summary,
    repositoryUrl: repoUrl,
    funding: deduplicateFunding(funding),
  };
}

async function fetchCratesFunding(
  name: string
): Promise<Partial<FundedDependency>> {
  const data = await fetchJson<{
    crate?: { description?: string; repository?: string };
  }>(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`);
  if (!data?.crate) return {};

  const funding: FundingLink[] = [];
  const repoUrl = data.crate.repository;
  if (repoUrl?.includes('github.com')) {
    funding.push(...(await fetchGitHubFunding(repoUrl)));
  }

  return {
    description: data.crate.description,
    repositoryUrl: repoUrl,
    funding: deduplicateFunding(funding),
  };
}

async function fetchFundingData(dep: RawDependency): Promise<FundedDependency> {
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

// ─── Route handler ────────────────────────────────────────────────────────────

export const maxDuration = 60; // Vercel max for hobby plan

export async function POST(req: NextRequest): Promise<NextResponse<ApiScanResponse>> {
  try {
    const body = await req.json();
    const { content, filename } = body as { content: string; filename: string };

    if (!content || !filename) {
      return NextResponse.json(
        { error: 'Missing content or filename' },
        { status: 400 }
      );
    }

    if (content.length > 500_000) {
      return NextResponse.json(
        { error: 'File too large (max 500KB)' },
        { status: 413 }
      );
    }

    const rawDeps = parseDependencies(content, filename);

    if (rawDeps.length === 0) {
      return NextResponse.json(
        { error: 'No dependencies found in the provided file.' },
        { status: 422 }
      );
    }

    // Cap at 100 deps for the web UI to prevent timeout
    const limited = rawDeps.slice(0, 100);
    const CONCURRENCY = 5;
    const results: FundedDependency[] = [];

    for (let i = 0; i < limited.length; i += CONCURRENCY) {
      const batch = limited.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(fetchFundingData));
      results.push(...batchResults);
    }

    const funded = results.filter((d) => d.hasFunding);
    const unfunded = results.filter((d) => !d.hasFunding);

    let projectName = filename.replace(/\.(json|txt|toml)$/, '');
    if (filename === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        if (pkg.name) projectName = pkg.name;
      } catch { /* ignore */ }
    }

    const scanResult: ScanResult = {
      projectName,
      ecosystem: inferEcosystem(filename),
      scannedAt: new Date().toISOString(),
      totalDependencies: results.length,
      fundedCount: funded.length,
      unfundedCount: unfunded.length,
      dependencies: results,
    };

    return NextResponse.json({ result: scanResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
