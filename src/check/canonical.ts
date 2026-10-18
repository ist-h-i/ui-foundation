import { createHash } from 'node:crypto';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}
export function stableJSON(value: unknown): string { return JSON.stringify(canonical(value), null, 2) + '\n'; }
export function configurationHash(value: unknown): string { return createHash('sha256').update(stableJSON(value)).digest('hex'); }
