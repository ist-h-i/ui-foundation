import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { SourceDiagnostic, SourceReport } from './check/types.ts';

/** Repository acceptance metadata. This does not suppress a checker diagnostic. */
export const warningReviewCategories = ['public-css-override', 'callable-replacement', 'layout-measurement', 'virtual-scroll',
  'print-document', 'external-renderer', 'dom-state', 'async-resource', 'projected-template', 'fixture-input', 'runtime-input'] as const;
export type WarningReviewCategory = typeof warningReviewCategories[number];
export const warningReviewInputs = ['examples/ui.config.repository.yaml', 'package.json', 'package-lock.json', 'src/config.ts', 'src/roles.ts', 'src/sync.ts',
  'src/check/bounded-search.ts', 'src/check/bundle.ts', 'src/check/canonical.ts', 'src/check/class-domain.ts', 'src/check/entry.ts',
  'src/check/policy.ts', 'src/check/report.ts', 'src/check/scanner.ts', 'src/check/styles.ts', 'src/check/tailwind.ts', 'src/check/types.ts'] as const;
export interface WarningReview {
  id: string;
  diagnostic: SourceDiagnostic;
  category: WarningReviewCategory;
  detail: string;
  disposition: 'retained-warning';
  source_sha256: string;
  producer: string;
  reason: string;
  verified_scope: string;
  remaining_scope: string;
  recheck_when: string[];
  evidence: { file: string; anchor: string; sha256: string; scope: string }[];
  producer_static_status: 'Unknown';
  universal_runtime_status: 'Unknown';
}
export interface WarningReviewRegistry { schema_version: 1; inputs: Record<string, string>; reviews: WarningReview[] }
export interface WarningReviewIssue { code: string; message: string; file?: string; review_id?: string }
export interface WarningReviewResult {
  valid: boolean;
  classified: number;
  source_errors: number;
  categories: Partial<Record<WarningReviewCategory, number>>;
  classified_warnings: WarningReview[];
  unclassified_warnings: SourceDiagnostic[];
  stale_reviews: string[];
  issues: WarningReviewIssue[];
}
const safePath = (path: string) => !!path && !/[:\\\0*?<>]/.test(path)
  && path.split('/').every(part => !!part && part !== '.' && part !== '..' && !['.git', 'node_modules'].includes(part.toLowerCase()));
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const identity = (d: SourceDiagnostic) => JSON.stringify([d.file, d.line, d.column, d.rule, d.severity, d.message, d.source]);

export function parseWarningReviewRegistry(input: unknown): WarningReviewRegistry {
  const errors: string[] = [];
  const object = (value: unknown, at: string, keys?: string[]): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(`${at}: expected an object`); return {}; }
    const result = value as Record<string, unknown>;
    if (keys) {
      for (const key of Object.keys(result)) if (!keys.includes(key)) errors.push(`${at}.${key}: unknown field`);
      for (const key of keys) if (!Object.hasOwn(result, key)) errors.push(`${at}.${key}: required field`);
    }
    return result;
  };
  const text = (value: unknown, at: string): string => {
    if (typeof value !== 'string' || !value.trim()) { errors.push(`${at}: expected nonempty text`); return ''; }
    return value;
  };
  const file = (value: unknown, at: string): string => {
    const path = text(value, at); if (path && !safePath(path)) errors.push(`${at}: unsafe project-relative path`); return path;
  };
  const digest = (value: unknown, at: string): string => {
    const result = text(value, at); if (result && !/^[a-f0-9]{64}$/.test(result)) errors.push(`${at}: expected a SHA-256 digest`); return result;
  };
  const list = (value: unknown, at: string, nonempty = false): unknown[] => {
    if (!Array.isArray(value)) { errors.push(`${at}: expected a list`); return []; }
    if (nonempty && !value.length) errors.push(`${at}: expected at least one item`);
    return value;
  };
  const root = object(input, '$', ['schema_version', 'inputs', 'reviews']);
  if (root.schema_version !== 1) errors.push('schema_version: expected 1');
  const inputs = object(root.inputs, 'inputs');
  for (const [path, value] of Object.entries(inputs)) { file(path, `inputs.${path}`); digest(value, `inputs.${path}`); }
  for (const path of warningReviewInputs) if (!Object.hasOwn(inputs, path)) errors.push(`inputs: missing analysis dependency ${path}`);
  const ids = new Set<string>(), sites = new Set<string>();
  for (const [index, value] of list(root.reviews, 'reviews').entries()) {
    const at = `reviews.${index}`;
    const row = object(value, at, ['id', 'diagnostic', 'category', 'detail', 'disposition', 'source_sha256', 'producer', 'reason', 'verified_scope',
      'remaining_scope', 'recheck_when', 'evidence', 'producer_static_status', 'universal_runtime_status']);
    const id = text(row.id, `${at}.id`);
    if (ids.has(id)) errors.push(`${at}: duplicate review id ${id}`); ids.add(id);
    for (const key of ['detail', 'producer', 'reason', 'verified_scope', 'remaining_scope']) text(row[key], `${at}.${key}`);
    if (!warningReviewCategories.includes(row.category as WarningReviewCategory)) errors.push(`${at}.category: unknown category`);
    if (row.disposition !== 'retained-warning') errors.push(`${at}.disposition: only retained-warning is classifiable`);
    if (row.producer_static_status !== 'Unknown' || row.universal_runtime_status !== 'Unknown') errors.push(`${at}: a review cannot certify unresolved values`);
    digest(row.source_sha256, `${at}.source_sha256`);
    const d = object(row.diagnostic, `${at}.diagnostic`, ['file', 'line', 'column', 'rule', 'severity', 'message', 'source', 'suggestion']);
    file(d.file, `${at}.diagnostic.file`);
    for (const key of ['rule', 'message', 'source', 'suggestion']) text(d[key], `${at}.diagnostic.${key}`);
    for (const key of ['line', 'column']) if (!Number.isSafeInteger(d[key]) || (d[key] as number) < 1) errors.push(`${at}.diagnostic.${key}: expected a positive integer`);
    if (d.severity !== 'warning') errors.push(`${at}.diagnostic.severity: errors cannot be reviewed as warnings`);
    const key = identity(d as unknown as SourceDiagnostic);
    if (sites.has(key)) errors.push(`${at}: duplicate diagnostic identity`); sites.add(key);
    list(row.recheck_when, `${at}.recheck_when`, true).forEach((item, i) => text(item, `${at}.recheck_when.${i}`));
    const evidence = list(row.evidence, `${at}.evidence`, true);
    for (const [i, item] of evidence.entries()) {
      const proof = object(item, `${at}.evidence.${i}`, ['file', 'anchor', 'sha256', 'scope']);
      file(proof.file, `${at}.evidence.${i}.file`); digest(proof.sha256, `${at}.evidence.${i}.sha256`);
      text(proof.anchor, `${at}.evidence.${i}.anchor`); text(proof.scope, `${at}.evidence.${i}.scope`);
    }
    if (!evidence.some(item => typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).file === 'string'
      && ((item as Record<string, unknown>).file as string).startsWith('tests/')
      && /\.(?:test|spec)\.(?:ts|mjs)$/.test((item as Record<string, unknown>).file as string))) errors.push(`${at}.evidence: an executable regression source is required`);
  }
  if (errors.length) throw new Error(`Invalid warning reviews:\n${errors.join('\n')}`);
  return input as WarningReviewRegistry;
}

export function matchWarningReviews(source: SourceReport, registry: WarningReviewRegistry): WarningReviewResult {
  const result: WarningReviewResult = { valid: true, classified: 0, source_errors: source.diagnostics.filter(d => d.severity === 'error').length,
    categories: {}, classified_warnings: [], unclassified_warnings: [], stale_reviews: [], issues: [] };
  if (!source.valid || source.status === 'failed' || source.status === 'not_configured' || result.source_errors) {
    result.issues.push({ code: 'source-check-failed', message: 'Source checks must be configured and valid; errors cannot be classified away.' });
  }
  const bySite = new Map(registry.reviews.map(row => [identity(row.diagnostic), row]));
  const seen = new Set<string>(), matched = new Set<string>();
  for (const diagnostic of source.diagnostics.filter(d => d.severity === 'warning')) {
    const key = identity(diagnostic);
    if (seen.has(key)) { result.issues.push({ code: 'duplicate-diagnostic', message: 'One diagnostic identity occurs more than once.', file: diagnostic.file }); continue; }
    seen.add(key);
    const row = bySite.get(key);
    if (!row) result.unclassified_warnings.push(diagnostic);
    else { result.classified_warnings.push(row); matched.add(row.id); result.categories[row.category] = (result.categories[row.category] ?? 0) + 1; }
  }
  result.classified = result.classified_warnings.length;
  result.stale_reviews = registry.reviews.filter(row => !matched.has(row.id)).map(row => row.id);
  for (const d of result.unclassified_warnings) result.issues.push({ code: 'unclassified-warning', message: 'New or changed warning requires source review.', file: d.file });
  for (const id of result.stale_reviews) result.issues.push({ code: 'stale-review', message: 'The reviewed diagnostic no longer occurs.', review_id: id });
  result.valid = !result.issues.length;
  return result;
}

async function projectFile(root: string, file: string): Promise<Buffer> {
  if (!safePath(file)) throw new Error(`Unsafe project-relative evidence path: ${file}`);
  let path = resolve(root);
  const parts = file.split('/');
  for (const [index, part] of parts.entries()) {
    path = resolve(path, part); const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`Symlink evidence is not allowed: ${file}`);
    if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) throw new Error(`Evidence is not a regular project file: ${file}`);
  }
  return readFile(path);
}

export async function checkWarningReviews(root: string, source: SourceReport, registryPath = 'docs/ui-warning-reviews.json'): Promise<WarningReviewResult> {
  const registry = parseWarningReviewRegistry(JSON.parse((await projectFile(root, registryPath)).toString('utf8')));
  const result = matchWarningReviews(source, registry);
  const files = new Map<string, Promise<Buffer>>();
  const read = (file: string) => { let pending = files.get(file); if (!pending) { pending = projectFile(root, file); files.set(file, pending); } return pending; };
  const check = async (file: string, expected: string, review_id?: string, anchor?: string) => {
    try {
      const bytes = await read(file);
      if (hash(bytes) !== expected) result.issues.push({ code: 'proof-drift', message: 'Reviewed dependency changed; re-audit its reason before refreshing the digest.', file, review_id });
      if (anchor && !bytes.toString('utf8').includes(anchor)) result.issues.push({ code: 'missing-anchor', message: 'Reviewed evidence anchor no longer exists.', file, review_id });
    } catch (error) { result.issues.push({ code: 'proof-read-error', message: String(error), file, review_id }); }
  };
  for (const [file, expected] of Object.entries(registry.inputs)) await check(file, expected);
  for (const row of registry.reviews) {
    await check(row.diagnostic.file, row.source_sha256, row.id);
    for (const evidence of row.evidence) await check(evidence.file, evidence.sha256, row.id, evidence.anchor);
  }
  result.valid = !result.issues.length;
  return result;
}
