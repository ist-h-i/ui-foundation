import type { ResolvedConfig } from '../config.ts';
import { semanticVariable } from '../roles.ts';
import { configurationHash } from './canonical.ts';
import { angularDeclarations } from './scanner.ts';
import type { SourcePolicy } from './types.ts';

export function createSourcePolicy(config: ResolvedConfig, files: Map<string, string> = new Map()): SourcePolicy {
  return {
    schema_version: 1,
    configuration_hash: configurationHash(config),
    semantic: Object.fromEntries(Object.entries(config.profiles[config.default_profile].semantic)
      .map(([role, token]) => [semanticVariable(role), { category: role.split('.')[0], type: token.type }])),
    generated_components: angularDeclarations(new Map([...files].filter(([path]) => path.startsWith(`${config.output}/angular/`)))),
    ...(config.checks ? { checks: config.checks } : {}),
  };
}
