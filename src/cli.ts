#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readPoFiles} from './poReader.js';
import {emitGo} from './goEmit.js';

interface ReposConfig {
  /** Base directory the repo paths are relative to. */
  base: string;
  /** Repo directory names to scan. */
  repos: string[];
  /** Glob-ish subpath within each repo (only `po/*.po` style is supported). */
  poDir?: string;
}

interface Args {
  config?: string;
  base?: string;
  out: string;
  pkg: string;
  withTest: boolean;
  poPaths: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = {out: 'generated', pkg: 'locales', withTest: false, poPaths: []};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--config': args.config = argv[++i]; break;
      case '--base': args.base = argv[++i]; break;
      case '--out': args.out = argv[++i]; break;
      case '--package': args.pkg = argv[++i]; break;
      case '--test': args.withTest = true; break;
      case '--help': case '-h': usage(); process.exit(0); break;
      default:
        if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
        args.poPaths.push(a);
    }
  }
  return args;
}

function usage(): void {
  console.log(`Usage: po2catalog [options] [file.po ...]

Reads Hebcal gettext .po files and generates a golang.org/x/text message
catalogue as Go source.

Options:
  --config <file>   JSON listing repos to scan (see repos.json)
  --base <dir>      Override the config's base directory
  --out <dir>       Output directory for generated Go (default: generated)
  --package <name>  Go package name (default: locales)
  --test            Also emit a self-checking _test.go and a go.mod
  -h, --help        Show this help

You may pass explicit .po paths and/or directories as positional arguments;
directories are scanned for *.po. With no inputs, --config repos.json is used.`);
}

/** Expand positional inputs (files or dirs) into a flat list of .po paths. */
function expandPoPaths(inputs: string[]): string[] {
  const out: string[] = [];
  for (const input of inputs) {
    const stat = fs.statSync(input);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(input).sort()) {
        if (f.endsWith('.po')) out.push(path.join(input, f));
      }
    } else {
      out.push(input);
    }
  }
  return out;
}

/** Resolve .po paths from a repos.json config. */
function poPathsFromConfig(configPath: string, baseOverride?: string): string[] {
  const cfg: ReposConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const base = baseOverride ?? cfg.base ?? '.';
  const poDir = cfg.poDir ?? 'po';
  const dirs = cfg.repos.map((r) => path.resolve(base, r, poDir));
  return expandPoPaths(dirs);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  let poPaths: string[];
  if (args.poPaths.length > 0) {
    poPaths = expandPoPaths(args.poPaths);
  } else {
    const config = args.config ?? 'repos.json';
    if (!fs.existsSync(config)) {
      console.error(`No .po inputs given and config "${config}" not found.`);
      usage();
      process.exit(2);
    }
    poPaths = poPathsFromConfig(config, args.base);
  }

  if (poPaths.length === 0) {
    console.error('No .po files found.');
    process.exit(1);
  }

  console.error(`Reading ${poPaths.length} .po file(s)...`);
  const catalog = readPoFiles(poPaths, {warn: (m) => console.error(`  warning: ${m}`)});

  const files = emitGo(catalog, {pkg: args.pkg, withTest: args.withTest});

  fs.mkdirSync(args.out, {recursive: true});
  for (const [name, src] of files) {
    fs.writeFileSync(path.join(args.out, name), src);
  }
  if (args.withTest) {
    writeGoMod(args.out);
  }
  gofmt(args.out);

  const total = [...catalog.values()].reduce((n, d) => n + d.size, 0);
  console.error(`Wrote ${files.size} Go file(s) to ${args.out}/ (${total} parsed entries across ${catalog.size} locales).`);
}

/** Best-effort: format the generated Go in place if gofmt is on PATH. */
function gofmt(outDir: string): void {
  const res = spawnSync('gofmt', ['-w', outDir], {stdio: 'ignore'});
  if (res.error) {
    console.error('  note: gofmt not found; output is unformatted (run "gofmt -w" yourself).');
  }
}

/** Write a minimal go.mod so the generated package builds/tests standalone. */
function writeGoMod(outDir: string): void {
  // go 1.18 is the floor: golang.org/x/text v0.21.0 is the newest release whose
  // own go.mod still targets 1.18 (v0.23.0+ jump to 1.23/1.24/1.25). The
  // generated code uses only long-stable x/text APIs, so this keeps the eventual
  // hebcal-go bump minimal (1.17 -> 1.18) rather than forcing a modern toolchain.
  const goMod = `module github.com/hebcal/locales/generated

go 1.18

require golang.org/x/text v0.21.0
`;
  fs.writeFileSync(path.join(outDir, 'go.mod'), goMod);
}

main();
