import { isAlias, isMap, isScalar, isSeq, LineCounter, parseDocument } from 'yaml';
import { CATEGORY_TYPES, CONTRAST_PAIRS, CORE_ROLES, semanticVariable, tailwindVariable } from './roles.ts';
import type { PrimitiveType } from './roles.ts';
import type { ChecksConfig } from './check/types.ts';

export type { PrimitiveType } from './roles.ts';
export interface Primitive { type: PrimitiveType; value: string | number }
export interface ProjectContext { product: string; goals: string[]; constraints: string[] }
export interface ProfileContext { audience: string[]; usage: string; goals: string[]; constraints: string[] }
export interface Profile {
  label: string;
  context: ProfileContext;
  guidance: string;
  semantic: Record<string, string>;
}
export interface FoundationConfig {
  schema_version: 1;
  context: ProjectContext;
  output: string;
  default_profile: string;
  primitives: Record<string, Primitive>;
  semantic: Record<string, string>;
  profiles: Record<string, Profile>;
  checks?: ChecksConfig;
}
export interface ResolvedToken extends Primitive { reference: string }
export interface ResolvedProfile extends Omit<Profile, 'semantic'> { semantic: Record<string, ResolvedToken> }
export interface ResolvedConfig extends Omit<FoundationConfig, 'semantic' | 'profiles'> {
  profiles: Record<string, ResolvedProfile>;
}
export interface ConfigIssue { path: string; message: string; line: number; column: number }
export class ConfigValidationError extends Error {
  constructor(public readonly issues: readonly ConfigIssue[]) {
    super(issues.map((issue) => `${issue.line}:${issue.column} ${issue.path}: ${issue.message}`).join('\n'));
    this.name = 'ConfigValidationError';
  }
}

type SourceLocations = Map<string, { line: number; column: number }>;
const locations = new WeakMap<FoundationConfig, SourceLocations>();
const own = (value: object, key: string): boolean => Object.hasOwn(value, key);
const safeName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const semanticName = /^([a-z]+)\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;
const numeric = '(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)';
const lengthValue = new RegExp(`^${numeric}(?:px|rem|em)$`);
const durationValue = new RegExp(`^${numeric}(?:ms|s)$`);
const easingValues = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end']);
const primitiveTypes = new Set<PrimitiveType>(['color', 'length', 'fontFamily', 'number', 'duration', 'easing']);

class Validator {
  readonly issues: ConfigIssue[] = [];
  constructor(private readonly source: SourceLocations = new Map()) {}
  issue(path: string, message: string) {
    let lookup = path;
    while (!this.source.has(lookup) && lookup.includes('.')) lookup = lookup.slice(0, lookup.lastIndexOf('.'));
    const position = this.source.get(lookup) ?? this.source.get('$') ?? { line: 1, column: 1 };
    this.issues.push({ path, message, ...position });
  }
  finish() { if (this.issues.length) throw new ConfigValidationError(this.issues); }
  object(value: unknown, path: string, allowed?: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      this.issue(path, 'Expected a mapping');
      return {};
    }
    const result = value as Record<string, unknown>;
    if (allowed) {
      for (const key of Object.keys(result)) {
        if (!allowed.includes(key)) this.issue(path === '$' ? key : `${path}.${key}`, `Unknown key "${key}"`);
      }
      for (const key of allowed) {
        if (!own(result, key) && !optional.includes(key)) this.issue(path === '$' ? key : `${path}.${key}`, `Required field "${key}" is missing`);
      }
    }
    return result;
  }
  text(value: unknown, path: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      this.issue(path, 'Expected a non-empty string');
      return '';
    }
    return value;
  }
  list(value: unknown, path: string, requireItem = false): string[] {
    if (!Array.isArray(value)) { this.issue(path, 'Expected a list of strings'); return []; }
    if (requireItem && !value.length) this.issue(path, 'Expected at least one item');
    return value.map((item, index) => this.text(item, `${path}.${index}`));
  }
  semantics(value: unknown, path: string): Record<string, string> {
    const map = this.object(value, path);
    const result: Record<string, string> = {};
    for (const role of Object.keys(map).sort()) {
      const match = semanticName.exec(role);
      if (!match || !own(CATEGORY_TYPES, match[1])) {
        this.issue(`${path}.${role}`, 'Semantic name must be a known category followed by one kebab-case role');
      }
      const reference = this.text(map[role], `${path}.${role}`);
      if (!safeName.test(reference)) this.issue(`${path}.${role}`, 'Semantic value must be a direct primitive reference');
      result[role] = reference;
    }
    return result;
  }
}

function safeFontFamily(value: string): boolean {
  const family = /^(?:"[\p{L}\p{N}_ -]+"|'[\p{L}\p{N}_ -]+'|[\p{L}_-][\p{L}\p{N}_ -]*)$/u;
  const reserved = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
  return value.split(',').every((part) => family.test(part.trim()) && !reserved.has(part.trim().toLowerCase()));
}

function validValue(type: PrimitiveType, value: unknown): boolean {
  switch (type) {
    case 'number': return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    case 'color': return typeof value === 'string' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value);
    case 'length': return typeof value === 'string' && lengthValue.test(value) && Number.isFinite(parseFloat(value));
    case 'duration': return typeof value === 'string' && durationValue.test(value) && Number.isFinite(parseFloat(value));
    case 'fontFamily': return typeof value === 'string' && safeFontFamily(value);
    case 'easing': return typeof value === 'string' && easingValues.has(value);
  }
}

function validateConfig(input: unknown, source: SourceLocations): FoundationConfig {
  const validator = new Validator(source);
  const root = validator.object(input, '$', ['schema_version', 'context', 'output', 'default_profile', 'primitives', 'semantic', 'profiles', 'checks'], ['checks']);
  if (root.schema_version !== 1) validator.issue('schema_version', 'Only schema_version: 1 is supported');
  const context = validator.object(root.context, 'context', ['product', 'goals', 'constraints']);
  const output = validator.text(root.output, 'output');
  if (output !== output.trim() || !output || output.startsWith('/') || /[\\\u0000-\u001f<>:"|?*]/.test(output)
    || output.split('/').some((part) => !part || part === '.' || part === '..')) {
    validator.issue('output', 'Output must be a normalized relative directory within the project');
  }
  const defaultProfile = validator.text(root.default_profile, 'default_profile');
  if (!safeName.test(defaultProfile)) validator.issue('default_profile', 'Expected a safe kebab-case profile ID');
  const primitiveInput = validator.object(root.primitives, 'primitives');
  if (!Object.keys(primitiveInput).length) validator.issue('primitives', 'Expected at least one primitive');
  const primitives: Record<string, Primitive> = {};
  for (const name of Object.keys(primitiveInput).sort()) {
    const path = `primitives.${name}`;
    if (!safeName.test(name)) validator.issue(path, 'Expected a safe kebab-case primitive name');
    const primitive = validator.object(primitiveInput[name], path, ['type', 'value']);
    const type = primitive.type as PrimitiveType;
    if (!primitiveTypes.has(type)) validator.issue(`${path}.type`, 'Unknown primitive type');
    else if (!validValue(type, primitive.value)) validator.issue(`${path}.value`, `Invalid ${type} value; use a supported literal value`);
    primitives[name] = { type, value: primitive.value as string | number };
  }
  const profilesInput = validator.object(root.profiles, 'profiles');
  if (!Object.keys(profilesInput).length) validator.issue('profiles', 'Expected at least one profile');
  const profiles: Record<string, Profile> = {};
  for (const id of Object.keys(profilesInput).sort()) {
    const path = `profiles.${id}`;
    if (!safeName.test(id)) validator.issue(path, 'Expected a safe kebab-case profile ID');
    const profile = validator.object(profilesInput[id], path, ['label', 'context', 'guidance', 'semantic']);
    const profileContext = validator.object(profile.context, `${path}.context`, ['audience', 'usage', 'goals', 'constraints']);
    profiles[id] = {
      label: validator.text(profile.label, `${path}.label`),
      context: {
        audience: validator.list(profileContext.audience, `${path}.context.audience`, true),
        usage: validator.text(profileContext.usage, `${path}.context.usage`),
        goals: validator.list(profileContext.goals, `${path}.context.goals`, true),
        constraints: validator.list(profileContext.constraints, `${path}.context.constraints`),
      },
      guidance: validator.text(profile.guidance, `${path}.guidance`),
      semantic: validator.semantics(profile.semantic, `${path}.semantic`),
    };
  }
  if (!own(profiles, defaultProfile)) validator.issue('default_profile', `Unknown default_profile "${defaultProfile}"`);
  const config: FoundationConfig = {
    schema_version: 1,
    context: {
      product: validator.text(context.product, 'context.product'),
      goals: validator.list(context.goals, 'context.goals', true),
      constraints: validator.list(context.constraints, 'context.constraints'),
    },
    output,
    default_profile: defaultProfile,
    primitives,
    semantic: validator.semantics(root.semantic, 'semantic'),
    profiles,
    ...(own(root, 'checks') ? { checks: validateChecks(root.checks, validator) } : {}),
  };
  validator.finish();
  return config;
}

function validateChecks(input: unknown, validator: Validator): ChecksConfig {
  const checks = validator.object(input, 'checks', ['source_roots', 'tsconfig', 'approved_components', 'exceptions'], ['tsconfig', 'approved_components', 'exceptions']);
  const path = (value: unknown, at: string): string => {
    const text = validator.text(value, at);
    if (text !== text.trim() || /[\\\u0000-\u001f<>:"|?*]/.test(text) || text.startsWith('/')
      || text.split('/').some(part => !part || part === '.' || part === '..' || ['.git', 'node_modules'].includes(part.toLowerCase()))) {
      validator.issue(at, 'Expected a normalized project-relative path without traversal or glob patterns');
    }
    return text;
  };
  const source_roots = validator.list(checks.source_roots, 'checks.source_roots', true)
    .map((value, index) => path(value, `checks.source_roots.${index}`));
  if (new Set(source_roots).size !== source_roots.length) validator.issue('checks.source_roots', 'Duplicate source roots');
  const array = (key: string): unknown[] => {
    if (!own(checks, key)) return [];
    if (!Array.isArray(checks[key])) { validator.issue(`checks.${key}`, 'Expected a list'); return []; }
    return checks[key] as unknown[];
  };
  const approved_components = array('approved_components').map((item, index) => {
    const at = `checks.approved_components.${index}`;
    const approval = validator.object(item, at, ['module', 'export', 'reason']);
    const module = validator.text(approval.module, `${at}.module`);
    if (!/^(?:@[a-z0-9_-]+\/)?[a-z0-9_-]+(?:\/[a-z0-9_.-]+)*$/i.test(module) || module.split('/').includes('..')) validator.issue(`${at}.module`, 'Expected a bare package module specifier');
    const name = validator.text(approval.export, `${at}.export`);
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) validator.issue(`${at}.export`, 'Expected an exported identifier');
    return { module, export: name, reason: validator.text(approval.reason, `${at}.reason`) };
  });
  const approvalKeys = approved_components.map(item => `${item.module}:${item.export}`);
  if (new Set(approvalKeys).size !== approvalKeys.length) validator.issue('checks.approved_components', 'Duplicate component approvals');
  const exceptionRules = new Set(['literal-token', 'primitive-reference', 'unknown-token', 'token-category', 'unapproved-component', 'unresolved']);
  const exceptions = array('exceptions').map((item, index) => {
    const at = `checks.exceptions.${index}`;
    const exception = validator.object(item, at, ['file', 'rule', 'source', 'reason', 'line', 'column'], ['line', 'column']);
    const rule = validator.text(exception.rule, `${at}.rule`);
    if (!exceptionRules.has(rule)) validator.issue(`${at}.rule`, 'Unknown or non-exemptible check rule');
    const coordinates: { line?: number; column?: number } = {};
    for (const coordinate of ['line', 'column'] as const) if (own(exception, coordinate)) {
      if (!Number.isSafeInteger(exception[coordinate]) || Number(exception[coordinate]) < 1) validator.issue(`${at}.${coordinate}`, 'Expected a positive integer source coordinate');
      else coordinates[coordinate] = Number(exception[coordinate]);
    }
    return { file: path(exception.file, `${at}.file`), rule,
      source: validator.text(exception.source, `${at}.source`), reason: validator.text(exception.reason, `${at}.reason`), ...coordinates };
  });
  return { source_roots, ...(own(checks, 'tsconfig') ? { tsconfig: path(checks.tsconfig, 'checks.tsconfig') } : {}), approved_components, exceptions };
}

/** Parse only literal YAML values; diagnostics retain the original key/value locations. */
export function parseConfig(source: string): FoundationConfig {
  const lineCounter = new LineCounter();
  const document = parseDocument(source, {
    lineCounter, prettyErrors: false, strict: true, uniqueKeys: true,
    version: '1.2', schema: 'core', merge: false, resolveKnownTags: false,
  });
  const sourceLocations: SourceLocations = new Map();
  const at = (offset: number) => {
    const { line, col } = lineCounter.linePos(offset);
    return { line, column: col };
  };
  if (document.errors.length || document.warnings.length) {
    throw new ConfigValidationError([...document.errors, ...document.warnings].map((error) => ({
      path: '$', message: error.message, ...at(error.pos[0]),
    })));
  }
  const validator = new Validator(sourceLocations);
  function read(node: unknown, path: string): unknown {
    const range = node && typeof node === 'object' && 'range' in node ? node.range as number[] | undefined : undefined;
    if (!sourceLocations.has(path)) sourceLocations.set(path, at(range?.[0] ?? 0));
    if (isAlias(node)) { validator.issue(path, 'YAML aliases are unsupported; use direct literal values'); return null; }
    if (node && typeof node === 'object' && 'tag' in node && node.tag) {
      validator.issue(path, 'Explicit YAML tags are unsupported; use literal values');
    }
    if (isScalar(node)) return node.value;
    if (isSeq(node)) return node.items.map((item, index) => read(item, `${path}.${index}`));
    if (isMap(node)) {
      const result: Record<string, unknown> = Object.create(null);
      for (const pair of node.items) {
        if (!isScalar(pair.key) || typeof pair.key.value !== 'string') {
          validator.issue(path, 'Mapping keys must be strings');
          continue;
        }
        const key = pair.key.value;
        const childPath = path === '$' ? key : `${path}.${key}`;
        sourceLocations.set(childPath, at(pair.key.range?.[0] ?? range?.[0] ?? 0));
        result[key] = read(pair.value, childPath);
      }
      return result;
    }
    return null;
  }
  const input = read(document.contents, '$');
  validator.finish();
  const config = validateConfig(input, sourceLocations);
  locations.set(config, sourceLocations);
  return config;
}

function contrast(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const hex = color.length === 4 ? [...color.slice(1)].map((digit) => digit + digit).join('') : color.slice(1);
    const channels = [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const left = luminance(foreground);
  const right = luminance(background);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

/** Resolve explicit references and validate the shared component contract for every profile. */
export function resolveConfig(input: FoundationConfig): ResolvedConfig {
  const sourceLocations = locations.get(input) ?? new Map();
  const config = validateConfig(input, sourceLocations);
  const validator = new Validator(sourceLocations);
  for (const role of Object.keys(CORE_ROLES)) {
    if (!own(config.semantic, role)) validator.issue(`semantic.${role}`, `Required role "${role}" is missing from the base semantic mapping`);
  }
  const roles = [...new Set([...Object.keys(config.semantic), ...Object.values(config.profiles).flatMap((profile) => Object.keys(profile.semantic))])].sort();
  const cssVariables = new Map<string, string>();
  const tailwindVariables = new Map<string, string>();
  for (const role of roles) {
    for (const [name, variables] of [[semanticVariable(role), cssVariables], [tailwindVariable(role), tailwindVariables]] as const) {
      if (!name) continue;
      const previous = variables.get(name);
      if (previous && previous !== role) validator.issue(`semantic.${role}`, `Variable name collision: "${role}" and "${previous}" both generate ${name}`);
      variables.set(name, role);
    }
  }
  const resolveToken = (role: string, reference: string, path: string): ResolvedToken | undefined => {
    if (!own(config.primitives, reference)) {
      validator.issue(path, `Unknown primitive reference "${reference}"`);
      return;
    }
    const primitive = config.primitives[reference];
    const expectedTypes = own(CORE_ROLES, role) ? [CORE_ROLES[role]] : CATEGORY_TYPES[role.split('.')[0]];
    if (!expectedTypes.includes(primitive.type)) {
      validator.issue(path, `Role "${role}" requires ${expectedTypes.join(' or ')}; "${reference}" has type ${primitive.type}`);
      return;
    }
    if (role.startsWith('weight.') && (Number(primitive.value) < 100 || Number(primitive.value) > 900)) {
      validator.issue(path, `Font weight role "${role}" must be between 100 and 900`);
    }
    if (role.startsWith('opacity.') && Number(primitive.value) > 1) {
      validator.issue(path, `Opacity role "${role}" must be between 0 and 1`);
    }
    if ((role.startsWith('leading.') || role.startsWith('text.') || role.startsWith('size.') || role === 'border.focus')
      && parseFloat(String(primitive.value)) <= 0) {
      validator.issue(path, `Role "${role}" value must be greater than zero`);
    }
    return { reference, ...primitive };
  };
  // Validate unused base references too: a profile override must not hide an invalid configuration.
  for (const [role, reference] of Object.entries(config.semantic)) resolveToken(role, reference, `semantic.${role}`);
  const profiles: Record<string, ResolvedProfile> = {};
  for (const [id, profile] of Object.entries(config.profiles)) {
    const references = { ...config.semantic, ...profile.semantic };
    const semantic: Record<string, ResolvedToken> = {};
    for (const role of roles) {
      const path = own(profile.semantic, role) ? `profiles.${id}.semantic.${role}` : `semantic.${role}`;
      if (!own(references, role)) {
        validator.issue(`profiles.${id}.semantic`, `Role "${role}" must be defined in every profile or the base semantic mapping`);
        continue;
      }
      const token = resolveToken(role, references[role], path);
      if (token) semantic[role] = token;
    }
    for (const [foreground, background] of CONTRAST_PAIRS) {
      const front = semantic[foreground];
      const back = semantic[background];
      if (!front || !back) continue;
      const ratio = contrast(String(front.value), String(back.value));
      if (ratio < 4.5) {
        const path = own(profile.semantic, foreground) ? `profiles.${id}.semantic.${foreground}` : `semantic.${foreground}`;
        validator.issue(path, `Profile "${id}" contrast ${foreground} / ${background} is ${ratio.toFixed(2)}:1; requires at least 4.5:1`);
      }
    }
    profiles[id] = { label: profile.label, context: profile.context, guidance: profile.guidance, semantic };
  }
  validator.finish();
  return {
    schema_version: config.schema_version,
    context: config.context,
    output: config.output,
    default_profile: config.default_profile,
    primitives: config.primitives,
    profiles,
    ...(config.checks ? { checks: config.checks } : {}),
  };
}
