import type { ResolvedConfig, ResolvedProfile } from './config.ts';
import { primitiveVariable, semanticVariable, tailwindVariable } from './roles.ts';

const profileDeclarations = (profile: ResolvedProfile): string[] => Object.keys(profile.semantic).sort()
  .map((role) => `  ${semanticVariable(role)}: var(${primitiveVariable(profile.semantic[role].reference)});`);

/** Complete mappings prevent an outer profile's partial overrides leaking into nested scopes. */
export function renderTokens(config: ResolvedConfig): string {
  const primitives = Object.keys(config.primitives).sort()
    .map((name) => `  ${primitiveVariable(name)}: ${config.primitives[name].value};`);
  const blocks = [
    ['/* Generated from explicit primitives and references. Edit ui.config.yaml, then sync. */', ':root {',
      ...primitives, ...profileDeclarations(config.profiles[config.default_profile]), '}'].join('\n'),
    ...Object.keys(config.profiles).sort().map((id) => [
      `[data-ui-profile="${id}"] {`, ...profileDeclarations(config.profiles[id]), '}',
    ].join('\n')),
  ];
  return `${blocks.join('\n\n')}\n`;
}

/** Inline references ensure utilities resolve semantic variables in the element's profile scope. */
export function renderTailwind(config: ResolvedConfig): string {
  const roles = Object.keys(config.profiles[config.default_profile].semantic).sort();
  const declarations = roles.flatMap((role) => {
    const variable = tailwindVariable(role);
    return variable ? [`  ${variable}: var(${semanticVariable(role)});`] : [];
  });
  return [
    '/* Tailwind v4: import alongside tokens.css; border, motion and opacity roles use CSS directly. */',
    '@theme inline {', ...declarations, '}', '',
  ].join('\n');
}
