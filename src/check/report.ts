import type { SourceReport } from './types.ts';

export function formatSourceReport(report: SourceReport): string[] {
  const lines = report.diagnostics.map(item => `${item.file}:${item.line}:${item.column} ${item.severity} [${item.rule}] ${item.message}\n  ${item.suggestion}`);
  if (report.status === 'not_configured') lines.push('Application source checks: NOT_CONFIGURED (add checks to the YAML configuration).');
  else lines.push(`Application source checks: ${report.status}; ${report.files} files, ${report.checked} checks, ${report.diagnostics.filter(item => item.severity === 'error').length} errors, ${report.diagnostics.filter(item => item.severity === 'warning').length} unverified warnings, ${report.exceptions.length} reasoned exceptions.`);
  lines.push('Static checks do not certify runtime behavior, visual quality, accessibility as a whole, or user understanding.');
  return lines;
}
