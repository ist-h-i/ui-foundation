import path from 'node:path';
import ts from 'typescript';
import type { SourceDiagnostic } from './types.ts';

export const publicAngularEntries = ['core.ts', 'index.ts'] as const;

// Share the rule list between the YAML parser, scanner and baseline comparison.
export const exceptableRules = [
  'literal-token', 'primitive-reference', 'unknown-token', 'token-category',
  'unapproved-component', 'unresolved', 'generated-internal-import',
] as const;

export function isExceptableRule(rule: string): boolean {
  return exceptableRules.some(candidate => candidate === rule);
}

export function fingerprint(diagnostic: Pick<SourceDiagnostic, 'file' | 'rule' | 'message' | 'source'>): string {
  return JSON.stringify([diagnostic.file, diagnostic.rule, diagnostic.message, diagnostic.source]);
}

export function readBaseline(text: string): Map<string, number> {
  const document = JSON.parse(text);
  const report = document?.source ?? document;
  const statuses = ['passed', 'warnings', 'failed'];
  if (!report || !statuses.includes(report.status) || !Array.isArray(report.diagnostics) || report.existing_diagnostics !== undefined) {
    throw new Error('Expected a full JSON source report from a configured check without --baseline.');
  }
  const counts = new Map<string, number>();
  for (const item of report.diagnostics) {
    if (!item || !['warning', 'error'].includes(item.severity)
        || ![item.file, item.rule, item.message, item.source].every(value => typeof value === 'string')) {
      throw new Error('The source baseline contains an invalid diagnostic.');
    }
    if (item.severity === 'error' && isExceptableRule(item.rule)) {
      const key = fingerprint(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

export function workspaceSourceRoots(file: string, text: string): { name: string; sourceRoot: string }[] {
  const parsed = ts.parseConfigFileTextToJson(file, text);
  if (parsed.error) throw new Error(ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n'));
  const projects: unknown = parsed.config?.projects;
  if (!projects || typeof projects !== 'object' || Array.isArray(projects)) {
    throw new Error('Expected an object of projects in angular.json.');
  }
  return Object.entries(projects).map(([name, project]) => {
    const root: unknown = project?.sourceRoot ?? project?.root;
    if (typeof root !== 'string' || path.isAbsolute(root) || /[\\\u0000-\u001f<>:"|?*]/.test(root) || root.split('/').includes('..')) {
      throw new Error(`Expected a project-relative sourceRoot or root for Angular project ${name}.`);
    }
    return { name, sourceRoot: path.normalize(root) };
  });
}
