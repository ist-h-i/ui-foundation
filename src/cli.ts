import { checkProject, initProject, syncProject } from './sync.ts';
import { formatSourceReport } from './check/report.ts';
import type { SourceCheckMode } from './check/types.ts';

const usage = 'Usage: ui-foundation <init|sync|check> [--config ui.config.yaml] [--language en|ja (init only)] [--dry-run (sync only)] [--from-output previous/path (sync only)] [--format text|json (check only)] [--require-source-checks (check only)] [--baseline path (check only)]';
async function main(args: string[]): Promise<void> {
  if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0]))) { console.log(usage); return; }
  const command = args.shift();
  if (!['init', 'sync', 'check'].includes(command ?? '')) throw new Error(usage);
  let configPath = 'ui.config.yaml';
  let dryRun = false;
  let language: 'en' | 'ja' = 'en';
  let fromOutput: string | undefined;
  let json = false;
  const sourceMode: SourceCheckMode = {};
  const seen = new Set<string>();
  while (args.length) {
    const flag = args.shift()!;
    if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}`);
    seen.add(flag);
    if (flag === '--config') {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error('--config requires a project-relative YAML path.');
      configPath = value;
    } else if (flag === '--language' && command === 'init') {
      const value = args.shift();
      if (value !== 'en' && value !== 'ja') throw new Error('--language requires en or ja.');
      language = value;
    } else if (flag === '--from-output' && command === 'sync') {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error('--from-output requires a project-relative previous output path.');
      fromOutput = value;
    } else if (flag === '--require-source-checks' && command === 'check') {
      sourceMode.requireSourceChecks = true;
    } else if (flag === '--baseline' && command === 'check') {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error('--baseline requires a project-relative JSON report path.');
      sourceMode.baselinePath = value;
    } else if (flag === '--format' && command === 'check') {
      const value = args.shift();
      if (!value || !['text', 'json'].includes(value)) throw new Error('--format requires text or json.');
      json = value === 'json';
    } else if (flag === '--dry-run' && command === 'sync') dryRun = true;
    else throw new Error(`Unknown option: ${flag}\n${usage}`);
  }
  const options = { root: process.cwd(), configPath };
  if (command === 'init') console.log(`Created ${await initProject({ ...options, language })}`);
  else if (command === 'sync') {
    const report = await syncProject({ ...options, dryRun, fromOutput });
    for (const change of report.changes) console.log(`${change.kind}: ${change.path}`);
    console.log(report.changes.length ? (dryRun ? 'Dry run: no files written.' : 'Generated UI foundation synchronized.') : 'Generated UI foundation is current.');
  } else {
    const report = await checkProject({ ...options, ...sourceMode });
    if (json) console.log(JSON.stringify(report));
    else {
      for (const difference of report.differences) console.error(difference);
      if (!report.differences.length) console.log('Configuration and generated files match.');
      for (const line of formatSourceReport(report.source)) console.log(line);
    }
    if (!report.valid) process.exitCode = 1;
  }
}

try { await main(process.argv.slice(2)); }
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (process.argv.some((arg, index, args) => arg === '--format' && args[index + 1] === 'json')) console.log(JSON.stringify({ valid: false, error: message }));
  else console.error(message);
  process.exitCode = 1;
}
