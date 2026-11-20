import { fileURLToPath } from 'node:url';
import { checkProject } from './sync.ts';
import { checkWarningReviews } from './warning-review.ts';

const usage = 'Usage: npm run ui:check:warnings -- [--format text|json]';
const args = process.argv.slice(2);
const jsonRequested = args.some((arg, index) => arg === '--format' && args[index + 1] === 'json');
try {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) console.log(usage);
  else {
    let format = 'text', seen = false;
    while (args.length) {
      const flag = args.shift();
      if (flag !== '--format') throw new Error(`Unknown option: ${flag}\n${usage}`);
      if (seen) throw new Error('Duplicate option: --format'); seen = true;
      const value = args.shift();
      if (value !== 'text' && value !== 'json') throw new Error('--format requires text or json.');
      format = value;
    }
    const root = fileURLToPath(new URL('../', import.meta.url));
    const project = await checkProject({ root, configPath: 'examples/ui.config.repository.yaml' });
    const review = await checkWarningReviews(root, project.source);
    const valid = project.valid && review.valid;
    if (format === 'json') console.log(JSON.stringify({ valid, project, review }));
    else {
      for (const difference of project.differences) console.error(difference);
      console.log(`UI warning classification: ${review.classified}/${project.source.diagnostics.filter(d => d.severity === 'warning').length}; ${review.source_errors} source errors; ${review.unclassified_warnings.length} unclassified; ${review.stale_reviews.length} stale.`);
      for (const [category, count] of Object.entries(review.categories)) console.log(`  ${category}: ${count}`);
      for (const d of [...project.source.diagnostics.filter(d => d.severity === 'error'), ...review.unclassified_warnings]) {
        console.error(`${d.file}:${d.line}:${d.column} ${d.severity} [${d.rule}] ${d.message}\n  ${d.suggestion}`);
      }
      for (const issue of review.issues) console.error(`${issue.review_id ?? issue.file ?? 'review'} [${issue.code}] ${issue.message}`);
      console.log('Classified warnings remain Unknown. See docs/ui-warning-reviews.json for reasons, evidence, scope and recheck conditions.');
    }
    if (!valid) process.exitCode = 1;
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonRequested) console.log(JSON.stringify({ valid: false, error: message })); else console.error(message);
  process.exitCode = 1;
}
