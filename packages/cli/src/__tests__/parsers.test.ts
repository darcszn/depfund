import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { parseNpm } from '../parsers/npm';
import { parsePypi } from '../parsers/pypi';

describe('npm parser', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'depfund-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses dependencies from package.json', () => {
    const pkg = {
      name: 'test-project',
      dependencies: { express: '^4.18.0', lodash: '~4.17.21' },
      devDependencies: { jest: '^29.0.0' },
    };
    const filePath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(filePath, JSON.stringify(pkg));

    const deps = parseNpm(filePath);
    expect(deps).toHaveLength(3);
    expect(deps.find((d) => d.name === 'express')).toBeTruthy();
    expect(deps.find((d) => d.name === 'lodash')).toBeTruthy();
    expect(deps.find((d) => d.name === 'jest')).toBeTruthy();
  });

  it('strips version prefixes', () => {
    const pkg = { dependencies: { react: '^18.2.0' } };
    const filePath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(filePath, JSON.stringify(pkg));

    const deps = parseNpm(filePath);
    expect(deps[0].version).toBe('18.2.0');
  });

  it('returns empty array for no dependencies', () => {
    const pkg = { name: 'empty-project' };
    const filePath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(filePath, JSON.stringify(pkg));

    const deps = parseNpm(filePath);
    expect(deps).toHaveLength(0);
  });

  it('assigns npm ecosystem', () => {
    const pkg = { dependencies: { chalk: '5.3.0' } };
    const filePath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(filePath, JSON.stringify(pkg));

    const deps = parseNpm(filePath);
    expect(deps[0].ecosystem).toBe('npm');
  });
});

describe('pypi parser', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'depfund-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses requirements.txt', () => {
    const content = [
      '# This is a comment',
      'requests>=2.28.0',
      'flask==2.3.0',
      'numpy',
    ].join('\n');
    const filePath = path.join(tmpDir, 'requirements.txt');
    fs.writeFileSync(filePath, content);

    const deps = parsePypi(filePath);
    expect(deps).toHaveLength(3);
    expect(deps.find((d) => d.name === 'requests')).toBeTruthy();
    expect(deps.find((d) => d.name === 'flask')).toBeTruthy();
    expect(deps.find((d) => d.name === 'numpy')).toBeTruthy();
  });

  it('skips comments and empty lines', () => {
    const content = '# comment\n\n  \nrequests';
    const filePath = path.join(tmpDir, 'requirements.txt');
    fs.writeFileSync(filePath, content);

    const deps = parsePypi(filePath);
    expect(deps).toHaveLength(1);
  });

  it('normalizes package names to lowercase with hyphens', () => {
    const content = 'Pillow==9.0.0\nBeautiful_Soup4';
    const filePath = path.join(tmpDir, 'requirements.txt');
    fs.writeFileSync(filePath, content);

    const deps = parsePypi(filePath);
    expect(deps[0].name).toBe('pillow');
    expect(deps[1].name).toBe('beautiful-soup4');
  });

  it('handles environment markers', () => {
    const content = "requests>=2.0; python_version >= '3.6'";
    const filePath = path.join(tmpDir, 'requirements.txt');
    fs.writeFileSync(filePath, content);

    const deps = parsePypi(filePath);
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('requests');
  });
});
