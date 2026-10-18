import { __unstable__loadDesignSystem } from 'tailwindcss';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';
import type { UtilityResolver } from './types.ts';
import { fallbackUtilityRoots } from './styles.ts';

let resolver: Promise<UtilityResolver> | undefined;

/** Use the pinned compiler's built-in grammar only: no app theme, plugins or imports. */
export function createUtilityResolver(): Promise<UtilityResolver> {
  return resolver ??= (async () => {
    const design = await __unstable__loadDesignSystem('');
    const utilityRoots = [...design.utilities.keys('static'), ...design.utilities.keys('functional'), ...fallbackUtilityRoots()];
    const cache = new Map<string, ReturnType<UtilityResolver>>();
    return Object.assign((candidate: string) => {
      if (cache.has(candidate)) return cache.get(candidate);
      const css = design.candidatesToCss([candidate])[0];
      if (!css) { cache.set(candidate, undefined); return undefined; }
      const root = postcss.parse(css);
      const declarations: postcss.Declaration[] = [];
      root.walkDecls(declaration => {
        let parent: postcss.Container | postcss.Document | undefined = declaration.parent;
        while (parent) {
          if (parent.type === 'rule') {
            let matches = false;
            selectorParser(selectors => selectors.walkClasses(node => { if (node.value === candidate) matches = true; })).processSync((parent as postcss.Rule).selector);
            if (matches) { declarations.push(declaration); break; }
          }
          parent = parent.parent;
        }
      });
      const parsedCandidate = design.parseCandidate(candidate)[0];
      const payload = parsedCandidate?.kind === 'arbitrary' ? parsedCandidate.value : parsedCandidate?.kind === 'functional' && parsedCandidate.value?.kind === 'arbitrary' ? parsedCandidate.value.value : undefined;
      const authoredVariables = new Set<string>();
      const modifier = parsedCandidate?.kind === 'functional' || parsedCandidate?.kind === 'arbitrary' ? parsedCandidate.modifier : undefined;
      const authoredText = [payload, modifier?.kind === 'arbitrary' ? modifier.value : undefined].filter(value => value !== undefined).join(' ');
      valueParser(authoredText).walk(node => {
        if (node.type === 'function' && node.value === 'var') {
          const name = node.nodes.find(item => item.type === 'word')?.value;
          if (name) authoredVariables.add(name);
        }
      });
      const variables = new Map(declarations.filter(d => d.prop.startsWith('--tw-')).map(d => [d.prop, d.value]));
      // Compiler-owned variables without a value in this utility are composed by
      // other utilities. Inspect this utility's authored values, not those slots.
      const expand = (value: string, seen = new Set<string>()): string => {
        const parsed = valueParser(value);
        parsed.walk(node => {
          if (node.type !== 'function' || node.value !== 'var') return;
          const name = node.nodes.find(item => item.type === 'word')?.value;
          if (!name?.startsWith('--tw-') || authoredVariables.has(name)) return;
          const comma = node.nodes.findIndex(item => item.type === 'div' && item.value === ',');
          const fallback = comma < 0 ? '' : valueParser.stringify(node.nodes.slice(comma + 1));
          const replacement = seen.has(name) ? '' : expand(variables.get(name) ?? fallback, new Set([...seen, name]));
          Object.assign(node, { type: 'word', value: replacement });
          return false;
        });
        return parsed.toString();
      };
      const result: [string, string][] = [];
      for (const d of declarations) {
        // Mask position/size/color utilities update one typed field. Other mask
        // layers and stops belong to other utilities, so an incomplete composed
        // image must not reinterpret that known field as a color stop.
        if (d.prop === 'mask-image' && /var\(--tw-mask-(linear|radial|conic)\)/.test(d.value) && declarations.some(field => /^--tw-mask-.*-(size|position|color)$/.test(field.prop))) continue;
        if (!d.prop.startsWith('--tw-')) { result.push([d.prop, expand(d.value)]); continue; }
        let property: string | undefined;
        if (/^--tw-gradient-(from|via|to)$/.test(d.prop)) property = 'color';
        else if (d.prop.endsWith('-color')) property = 'color';
        else if (/^--tw-mask-.*-position$/.test(d.prop)) property = 'mask-position';
        else if (/^--tw-mask-.*-size$/.test(d.prop)) property = 'mask-size';
        else if (/^--tw-gradient-.*-position$/.test(d.prop)) property = 'background-position';
        else if (/^--tw-(?:inset-)?ring-shadow$/.test(d.prop) && payload !== undefined) {
          result.push(['outline-width', payload]); continue;
        } else if (/^--tw-(?:translate|scale)-[xyz]$/.test(d.prop)) property = d.prop.includes('-scale-') ? 'scale' : 'translate';
        else if (/^--tw-(?:rotate|skew)-[xyz]$/.test(d.prop)) property = 'transform';
        else if (d.prop === '--tw-font-weight') property = 'font-weight';
        else if (/^--tw-(?:inset-)?shadow$/.test(d.prop)) property = 'box-shadow';
        else if (d.prop === '--tw-text-shadow') property = 'text-shadow';
        else if (/^--tw-(?:backdrop-)?(?:blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia|drop-shadow)$/.test(d.prop)) property = 'filter';
        if (property) result.push([property, expand(d.value)]);
      }
      cache.set(candidate, result);
      return result;
    }, {
      disjointClassPrefix: (prefix: string): boolean => {
        if (!/^[a-z]+-$/.test(prefix)) return false;
        const base = prefix.slice(0, -1);
        return !utilityRoots.some(root => root === base || root.startsWith(`${base}-`));
      },
      variantThresholds: (variant: string): string[] => {
        let parsed = design.parseVariant(variant);
        // Compound variants (for example not-*) retain their child's dimension.
        // Use the pinned grammar so modifiers/nesting cannot hide its payload.
        while (parsed?.kind === 'compound') parsed = parsed.variant;
        return parsed?.kind === 'functional' && ['min', 'max', '@', '@min', '@max'].includes(parsed.root) && parsed.value?.kind === 'arbitrary'
          ? [parsed.value.value] : [];
      },
    });
  })();
}
