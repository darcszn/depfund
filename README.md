# depfund

**Universal dependency funding scanner** — surface funding information for every package your project depends on, across npm, PyPI, and crates.io.

[![npm version](https://img.shields.io/npm/v/depfund?color=green&label=npm)](https://www.npmjs.com/package/depfund)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/darcszn/depfund/actions/workflows/ci.yml/badge.svg)](https://github.com/darcszn/depfund/actions/workflows/ci.yml)

---

## What is depfund?

Most open source projects run on volunteer time and donations. The libraries you depend on — the ones your entire product is built on — may be maintained by a single person in their spare time. **depfund** makes the funding situation visible so you can choose to support the projects that keep your stack running.

Drop in your `package.json`, `requirements.txt`, or `Cargo.toml` and get an instant report:

- Which packages have funding links (GitHub Sponsors, Patreon, OpenCollective, Ko-fi, etc.)
- Where each funding link points
- A generated `FUNDING.json` with suggested split weights for each funded dependency

---

## Try it online

**Web UI:** [depfund.vercel.app](https://depfund.vercel.app) — upload a manifest file, see the results instantly. No account needed.

---

## Install the CLI

```bash
npm install -g depfund
```

Or run without installing:

```bash
npx depfund scan
```

---

## CLI Usage

### Scan the current directory

Run `depfund` in any project directory. It auto-detects your manifest file.

```bash
cd my-project
depfund scan
```

```
depfund — my-project (npm)
Scanned 24 dependencies on 2026-08-12T10:30:00.000Z

┌──────────────────────────────┬────────────┬──────────┬──────────────────────────────────────────────────┐
│ Package                      │ Version    │ Funding  │ Links                                            │
├──────────────────────────────┼────────────┼──────────┼──────────────────────────────────────────────────┤
│ chalk                        │ 5.3.0      │ ✔ yes    │ [github] https://github.com/sponsors/sindresorhus │
│ commander                    │ 12.1.0     │ ✔ yes    │ [opencollective] https://opencollective.com/...   │
│ lodash                       │ 4.17.21    │ ✘ no     │ —                                                │
└──────────────────────────────┴────────────┴──────────┴──────────────────────────────────────────────────┘

Summary: 14 funded / 10 unfunded (58% of your deps have funding info)
```

---

### Scan a specific file

```bash
depfund scan --file ./path/to/package.json
depfund scan --file requirements.txt
depfund scan --file Cargo.toml
```

### Output formats

**JSON** — machine-readable, pipe into scripts:

```bash
depfund scan --json
depfund scan --json --output report.json
```

**Markdown** — paste into your README or issue tracker:

```bash
depfund scan --markdown
depfund scan --markdown --output FUNDING_REPORT.md
```

### Include transitive dependencies (npm)

```bash
depfund scan --transitive
```

This reads `package-lock.json` to surface funding info for your entire dependency tree, not just direct deps.

### Generate FUNDING.json

Creates a `FUNDING.json` with equal split weights across all funded dependencies — useful as a starting point for setting up fund distribution.

```bash
depfund generate-funding
```

Output (`FUNDING.json`):

```json
{
  "$schema": "https://depfund.dev/schema/funding.json",
  "version": "1.0",
  "generatedAt": "2026-08-12T10:30:00.000Z",
  "project": "my-project",
  "splits": [
    {
      "name": "chalk",
      "ecosystem": "npm",
      "weight": 7,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/sindresorhus"
        }
      ]
    }
  ]
}
```

---

## Supported ecosystems

| Ecosystem | Manifest files | Registry | GitHub FUNDING.yml |
| --- | --- | --- | --- |
| **npm** | `package.json`, `package-lock.json` | registry.npmjs.org | ✅ |
| **PyPI** | `requirements.txt`, `pyproject.toml` | pypi.org | ✅ |
| **crates.io** | `Cargo.toml` | crates.io | ✅ |

Funding is detected from:
1. The `funding` field in `package.json` (npm)
2. `project_urls` in PyPI metadata (donate/sponsor/funding keys)
3. `.github/FUNDING.yml` in the package's GitHub repository (all ecosystems)

---

## Supported funding platforms

| Platform | Auto-detected |
| --- | --- |
| GitHub Sponsors | ✅ |
| Patreon | ✅ |
| OpenCollective | ✅ |
| Ko-fi | ✅ |
| Liberapay | ✅ |
| Tidelift | ✅ |
| Custom URL | ✅ |

---

## Use as a library

depfund exports its core functions so you can integrate scanning into your own tools:

```typescript
import { scan, toJson, toMarkdown } from 'depfund';

const result = await scan({ file: './package.json' });

console.log(`${result.fundedCount} of ${result.totalDependencies} deps have funding info`);
console.log(toMarkdown(result));
```

```typescript
import { parseDependencies, fetchAllFunding } from 'depfund';

const deps = parseDependencies('./requirements.txt', 'pypi');
const funded = await fetchAllFunding(deps, (done, total) => {
  console.log(`${done}/${total} processed`);
});
```

Full type definitions are exported — works with TypeScript out of the box.

---

## Project structure

```
depfund/
├── packages/
│   ├── cli/                   # TypeScript CLI (published to npm as `depfund`)
│   │   ├── src/
│   │   │   ├── parsers/       # Manifest file parsers (npm, pypi, crates)
│   │   │   ├── fetcher.ts     # Registry + GitHub FUNDING.yml fetching
│   │   │   ├── reporter.ts    # Output formatters (table, JSON, markdown)
│   │   │   ├── scanner.ts     # Orchestration layer
│   │   │   ├── cli.ts         # CLI entry point (commander)
│   │   │   └── types.ts       # Shared TypeScript types
│   │   └── __tests__/         # Jest unit tests
│   └── web/                   # Next.js 14 web UI
│       ├── src/
│       │   ├── app/           # App Router pages + API routes
│       │   └── components/    # React components
│       └── public/
├── .github/workflows/         # GitHub Actions CI
└── vercel.json                # Vercel deployment config
```

---

## Web UI features

The web interface at [depfund.vercel.app](https://depfund.vercel.app) provides:

- **Drag-and-drop** file upload — no install required
- **Instant results** with a live funding coverage bar
- **Filter & search** — view all, funded only, or unfunded only
- **Sortable table** — by name or funding status
- **Expandable rows** — click any package to see all funding links
- **Export** — download as JSON or Markdown
- **One-click examples** — try with a sample npm, PyPI, or Rust project
- Files are never stored — everything is processed in memory per request

---

## Local development

```bash
# Clone the repo
git clone https://github.com/darcszn/depfund.git
cd depfund

# Install all dependencies (monorepo)
npm install

# Build the CLI
npm run build --workspace=packages/cli

# Run CLI in dev mode (watch)
npm run dev:cli

# Start the web UI
npm run dev:web

# Run tests
npm test
```

### Running the CLI locally (without publishing)

```bash
cd packages/cli
npm run build
node dist/cli.js scan
```

---

## API reference

### `scan(options, onProgress?)`

Main scanning function. Detects or reads a manifest, fetches funding data, and returns a `ScanResult`.

```typescript
interface ScanOptions {
  file?: string;           // Path to manifest file
  ecosystem?: Ecosystem;   // Override ecosystem detection
  includeTransitive?: boolean; // Include transitive deps (npm)
}

type ScanResult = {
  projectName: string;
  ecosystem: Ecosystem;
  scannedAt: string;           // ISO 8601
  totalDependencies: number;
  fundedCount: number;
  unfundedCount: number;
  dependencies: FundedDependency[];
}
```

### `fetchFundingData(dep)`

Fetch funding data for a single dependency. Useful if you already have a parsed dep list.

### `parseDependencies(filePath, ecosystem, includeTransitive?)`

Parse a manifest file into a list of `RawDependency` objects without hitting any network.

---

## Contributing

Contributions are welcome. Here's how to get started:

1. **Fork** the repo and create a branch: `git checkout -b feat/your-feature`
2. **Make your changes** — add tests for any new parsing or fetching logic
3. **Run the tests**: `npm test`
4. **Submit a PR** with a clear description of what changed and why

### Ideas for contributions

- Go modules support (`go.mod` parsing)
- Pub.dev (Dart/Flutter) support
- Maven / Gradle (Java) support
- A GitHub Action that comments funding info on PRs
- Better TOML parsing for edge-case `Cargo.toml` formats
- Caching layer for repeated scans

### Code standards

- TypeScript strict mode throughout
- Tests for all parsers and fetchers
- No new runtime dependencies without discussion first — the CLI bundle size matters

---

## Why this project?

Open source sustainability is a real problem. Popular packages used by millions of projects are maintained by individuals who often burn out or abandon their work. [Drips](https://www.drips.network/), OpenCollective, and GitHub Sponsors have made it easier than ever to fund maintainers — but most developers never look at the funding links even when they exist.

depfund closes the discovery gap: if every developer could see at a glance which of their dependencies have funding links and where to go, the funding flow through the ecosystem would improve meaningfully.

---

## License

[MIT](LICENSE) — © 2026 [darcszn](https://github.com/darcszn)
