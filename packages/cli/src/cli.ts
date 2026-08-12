#!/usr/bin/env node
import { Command } from 'commander';
import { scan } from './scanner.js';
import { printTable, toJson, toMarkdown } from './reporter.js';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('depfund')
  .description('Universal dependency funding scanner')
  .version('0.1.0');

// ─── scan command (default) ───────────────────────────────────────────────────

program
  .command('scan', { isDefault: true })
  .description('Scan project dependencies for funding information')
  .option(
    '-f, --file <path>',
    'Path to manifest file (package.json, requirements.txt, Cargo.toml)'
  )
  .option('-e, --ecosystem <type>', 'Ecosystem override: npm | pypi | crates')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as Markdown')
  .option('-o, --output <file>', 'Write output to file')
  .option('--transitive', 'Include transitive dependencies (npm only)')
  .action(async (opts) => {
    let spinner: { stop: () => void; text: string } | null = null;

    try {
      const { default: ora } = await import('ora');
      spinner = ora('Scanning dependencies...').start();

      const result = await scan(
        {
          file: opts.file,
          ecosystem: opts.ecosystem,
          json: opts.json,
          markdown: opts.markdown,
          output: opts.output,
          includeTransitive: opts.transitive,
        },
        (done, total) => {
          if (spinner) spinner.text = `Fetching funding data... (${done}/${total})`;
        }
      );

      spinner?.stop();

      if (opts.json) {
        const output = toJson(result);
        if (opts.output) {
          fs.writeFileSync(path.resolve(opts.output), output, 'utf-8');
          console.log(`JSON written to ${opts.output}`);
        } else {
          console.log(output);
        }
      } else if (opts.markdown) {
        const output = toMarkdown(result);
        if (opts.output) {
          fs.writeFileSync(path.resolve(opts.output), output, 'utf-8');
          console.log(`Markdown written to ${opts.output}`);
        } else {
          console.log(output);
        }
      } else {
        await printTable(result);
        if (opts.output) {
          fs.writeFileSync(
            path.resolve(opts.output),
            toJson(result),
            'utf-8'
          );
          console.log(`Report saved to ${opts.output}`);
        }
      }
    } catch (err) {
      spinner?.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${msg}`);
      process.exit(1);
    }
  });

// ─── generate-funding command ─────────────────────────────────────────────────

program
  .command('generate-funding')
  .description(
    'Generate a FUNDING.json with suggested split weights for funded dependencies'
  )
  .option('-f, --file <path>', 'Path to manifest file')
  .option('-o, --output <file>', 'Output path', 'FUNDING.json')
  .action(async (opts) => {
    let spinner: { stop: () => void; text: string } | null = null;

    try {
      const { default: ora } = await import('ora');
      spinner = ora('Generating FUNDING.json...').start();

      const result = await scan({ file: opts.file }, (done, total) => {
        if (spinner) spinner.text = `Fetching funding data... (${done}/${total})`;
      });

      spinner?.stop();

      const funded = result.dependencies.filter((d) => d.hasFunding);
      const weight = funded.length > 0 ? Math.floor(100 / funded.length) : 0;
      const remainder = 100 - weight * funded.length;

      const fundingJson = {
        $schema: 'https://depfund.dev/schema/funding.json',
        version: '1.0',
        generatedAt: result.scannedAt,
        project: result.projectName,
        splits: funded.map((d, i) => ({
          name: d.name,
          ecosystem: d.ecosystem,
          weight: i === 0 ? weight + remainder : weight,
          funding: d.funding,
        })),
      };

      fs.writeFileSync(
        path.resolve(opts.output),
        JSON.stringify(fundingJson, null, 2),
        'utf-8'
      );
      console.log(`\nFUNDING.json written to ${opts.output}`);
      console.log(
        `Generated ${funded.length} splits across funded dependencies.`
      );
    } catch (err) {
      spinner?.stop();
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${msg}`);
      process.exit(1);
    }
  });

program.parse();
