import type { SourceReport } from './types.ts';

export function formatSourceReport(report: SourceReport): string[] {
  const lines = report.diagnostics.map(item => `${item.file}:${item.line}:${item.column} ${item.severity} [${item.rule}] ${item.message}\n  ${item.suggestion}`);
  if (report.source_roots) lines.push(`Configured source roots: ${report.source_roots.join(', ')}`);
  for (const item of report.existing_diagnostics ?? []) {
    lines.push(`${item.file}:${item.line}:${item.column} existing violation [${item.rule}] ${item.message}\n  ${item.suggestion}`);
  }
  for (const project of report.excluded_projects ?? []) {
    lines.push(`Angular project ${project.name} intentionally excluded (${project.source_root}): ${project.reason}`);
  }
  if (report.status === 'not_configured') lines.push('Application source checks: NOT_CONFIGURED (add checks to the YAML configuration).' + (report.valid ? '' : ' Source checks are required for this run.'));
  else lines.push(`Application source checks: ${report.status}; ${report.files} files, ${report.checked} checks, ${report.diagnostics.filter(item => item.severity === 'error').length} errors, ${report.diagnostics.filter(item => item.severity === 'warning').length} warnings, ${report.exceptions.length} reasoned exceptions.`);
  if (report.existing_diagnostics) lines.push(`Baseline result: ${report.existing_diagnostics.length} existing violations; active errors are new violations or check failures.`);
  lines.push('Static checks do not certify runtime behavior, visual quality, accessibility as a whole, or user understanding.');
  return lines;
}
