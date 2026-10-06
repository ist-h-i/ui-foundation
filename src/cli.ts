import { checkProject, initProject, syncProject } from './sync.ts';

const usage = 'Usage: tsx src/cli.ts <init|sync|check> [--config ui.config.yaml] [--dry-run (sync only)] [--from-output previous/path (sync only)]';
async function main(args: string[]): Promise<void> {
  if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0]))) { console.log(usage); return; }
  const command = args.shift();
  if (!['init', 'sync', 'check'].includes(command ?? '')) throw new Error(usage);
  let configPath = 'ui.config.yaml';
  let dryRun = false;
  let fromOutput: string | undefined;
  const seen = new Set<string>();
  while (args.length) {
    const flag = args.shift()!;
    if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}`);
    seen.add(flag);
    if (flag === '--config') {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error('--config requires a project-relative YAML path.');
      configPath = value;
    } else if (flag === '--from-output' && command === 'sync') {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error('--from-output requires a project-relative previous output path.');
      fromOutput = value;
    } else if (flag === '--dry-run' && command === 'sync') dryRun = true;
    else throw new Error(`Unknown option: ${flag}\n${usage}`);
  }
  const options = { root: process.cwd(), configPath };
  if (command === 'init') console.log(`Created ${await initProject(options)}`);
  else if (command === 'sync') {
    const report = await syncProject({ ...options, dryRun, fromOutput });
    for (const change of report.changes) console.log(`${change.kind}: ${change.path}`);
    console.log(report.changes.length ? (dryRun ? 'Dry run: no files written.' : 'Generated UI foundation synchronized.') : 'Generated UI foundation is current.');
  } else {
    const report = await checkProject(options);
    if (!report.valid) { for (const difference of report.differences) console.error(difference); process.exitCode = 1; }
    else console.log('Configuration and generated files match. Application behavior and user understanding are not checked by this command.');
  }
}

try { await main(process.argv.slice(2)); }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
