import postcss from 'postcss';
import scssParser from 'postcss-scss';
import valueParser from 'postcss-value-parser';
import selectorParser from 'postcss-selector-parser';
import { withBaselineContext } from './application.ts';
import type { CustomPropertyOrigin, CustomPropertyResolver, SourceDiagnostic, SourceLocation, StyleContext } from './types.ts';

type RuleSpec = { categories: string[]; keywords?: string[]; full?: boolean; identity?: boolean };
type LocalAliasResolver = CustomPropertyResolver;
type AliasLayer = 'all' | 'own' | 'incoming';
const supportedMath = /^(calc|min|max|clamp)$/;
const resets = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
const borderStyles = ['none', 'hidden', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'];
const colorKeywords = ['transparent', 'currentcolor'];
const lengthKeywords = ['auto', 'none', 'min-content', 'max-content', 'fit-content', 'stretch', 'contain'];
const colorSpec: RuleSpec = { categories: ['color'], keywords: colorKeywords };

/** Only token-controlled properties are inspected. Layout/name/behavior keywords remain CSS. */
function specFor(property: string): RuleSpec | undefined {
  const p = property.toLowerCase();
  if (/^(fill|stroke)$/.test(p)) return { categories: ['color'], keywords: [...colorKeywords, 'none'] };
  if (/^(color|text-fill-color|background-color|accent-color|caret-color|fill|stroke|stop-color|flood-color|lighting-color|text-decoration-color|text-emphasis-color|column-rule-color|scrollbar-color)$/.test(p)) return colorSpec;
  if (p === 'background' || p === 'background-image' || p === 'mask-image' || p === 'list-style-image') return { categories: ['color', 'size', 'space'], keywords: [...colorKeywords, 'none', 'center', 'left', 'right', 'top', 'bottom', 'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round', 'cover', 'contain', 'scroll', 'fixed', 'local', 'border-box', 'padding-box', 'content-box'] };
  if (p === 'font-family') return { categories: ['font'] };
  if (p === 'font-size') return { categories: ['text'] };
  if (p === 'font-weight') return { categories: ['weight'] };
  if (p === 'line-height') return { categories: ['leading'], keywords: ['normal'] };
  if (p === 'font') return { categories: ['font', 'text', 'leading', 'weight'], keywords: ['normal', 'italic', 'oblique', 'small-caps'] };
  if (p === 'text-decoration') return { categories: ['color', 'border'], keywords: [...colorKeywords, 'none', 'underline', 'overline', 'line-through', 'solid', 'double', 'dotted', 'dashed', 'wavy', 'auto', 'from-font'] };
  if (p === 'text-emphasis') return { categories: ['color'], keywords: [...colorKeywords, 'none', 'filled', 'open', 'dot', 'circle', 'double-circle', 'triangle', 'sesame'] };
  if (/^(letter-spacing|word-spacing|text-indent)$/.test(p)) return { categories: ['space'], keywords: ['normal'] };
  if (/^(margin|padding|scroll-margin|scroll-padding)(-|$)/.test(p) || /^(gap|row-gap|column-gap)$/.test(p)) return { categories: ['space', 'border'], keywords: ['auto', 'normal'] };
  if (/^border(?:-(?:top|right|bottom|left|top-left|top-right|bottom-left|bottom-right|start-start|start-end|end-start|end-end))?-radius$/.test(p) || p === 'border-radius') return { categories: ['radius'] };
  if (/^(border|outline|column-rule)(?:-(?:top|right|bottom|left|block|inline|start|end))*(?:-color)$/.test(p)) return colorSpec;
  if (/^(border|outline|column-rule)(?:-(?:top|right|bottom|left|block|inline|start|end))*(?:-width)$/.test(p) || /^(outline-offset|text-decoration-thickness|text-underline-offset|stroke-width)$/.test(p)) return { categories: ['border'], keywords: ['auto', 'from-font'] };
  if (/^(border|outline|column-rule)(?:-(?:top|right|bottom|left|block|inline|start|end))*$/.test(p)) return { categories: ['border', 'color'], keywords: [...borderStyles, ...colorKeywords] };
  if (/^border-spacing(?:-[xy])?$/.test(p)) return { categories: ['space', 'border'] };
  if (/^border-image(?:-source)?$/.test(p)) return { categories: ['color', 'border', 'size', 'space'], keywords: [...colorKeywords, 'none', 'fill', 'stretch', 'repeat', 'round', 'space', 'auto'] };
  if (/^border-image-(?:slice|width|outset)$/.test(p)) return { categories: ['border', 'size', 'space'], keywords: ['auto', 'fill'] };
  if (/^(?:min-|max-)?(?:width|height|inline-size|block-size)$/.test(p) || p === 'flex-basis') return { categories: ['size', 'space', 'border'], keywords: lengthKeywords, full: true };
  if (/^(?:top|right|bottom|left|inset(?:-(?:block|inline)(?:-(?:start|end))?)?)$/.test(p)) return { categories: ['size', 'space', 'border'], keywords: ['auto'] };
  if (/^((?:background|mask)-(?:size|position|position-x|position-y)|object-position|transform-origin|perspective-origin)$/.test(p)) return { categories: ['size', 'space'], keywords: ['auto', 'cover', 'contain', 'center', 'left', 'right', 'top', 'bottom'] };
  if (/^(grid-template-(?:columns|rows)|grid-auto-(?:columns|rows))$/.test(p)) return { categories: ['size', 'space'], keywords: [...lengthKeywords, 'subgrid', 'masonry'] };
  if (p === 'flex') return { categories: ['size', 'space', 'border'], keywords: ['auto', 'none', 'content'] };
  if (/^(stroke-dasharray|stroke-dashoffset)$/.test(p)) return { categories: ['border', 'size'], keywords: ['none'] };
  if (p === 'columns' || p === 'column-width' || p === 'tab-size' || p === 'vertical-align') return { categories: ['size', 'space'], keywords: ['auto', 'baseline', 'sub', 'super', 'text-top', 'text-bottom', 'middle', 'top', 'bottom'] };
  if (p === 'zoom') return { categories: ['size'], keywords: ['normal'], identity: true };
  if (p === 'aspect-ratio') return { categories: ['size'], keywords: ['auto'] };
  if (/^(box-shadow|text-shadow)$/.test(p)) return { categories: ['color', 'size', 'space', 'border'], keywords: ['none', 'inset', ...colorKeywords] };
  if (/^(opacity|fill-opacity|stroke-opacity|stop-opacity)$/.test(p)) return { categories: ['opacity'], identity: true };
  if (/^(animation|transition)(?:-(?:duration|delay|timing-function))?$/.test(p)) return { categories: ['motion'], keywords: ['none'], identity: false };
  if (p === 'transform' || p === 'translate' || p === 'scale' || p === 'rotate' || p === 'perspective') return { categories: ['size', 'space'], keywords: ['none'], identity: true };
  if (p === 'filter' || p === 'backdrop-filter') return { categories: ['size', 'color', 'opacity'], keywords: ['none'], identity: true };
  if (p === 'clip' || p === 'clip-path') return { categories: ['size'], keywords: ['auto', 'none'] };
  return undefined;
}

export function diagnostic(location: SourceLocation, rule: string, severity: 'error' | 'warning', message: string, suggestion: string, source = ''): SourceDiagnostic {
  const prefix = location.text.slice(0, Math.max(0, location.offset));
  const lastBreak = prefix.lastIndexOf('\n');
  return { file: location.file, line: prefix.split('\n').length, column: prefix.length - lastBreak, rule, severity, message, suggestion, source };
}

/** Values are parsed; application expressions and Sass are never executed. */
export function checkStyle(property: string, value: string, location: SourceLocation, context: StyleContext, resolveAlias?: LocalAliasResolver): void {
  const normalizedProperty = property.startsWith('--') ? property : property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).toLowerCase().replace(/^-(?:webkit|moz|ms|o)-/, '');
  const declaredToken = context.policy.semantic[normalizedProperty];
  const propertySpec = declaredToken ? { categories: [declaredToken.category] } : specFor(normalizedProperty);
  const referenceOnly = !propertySpec;
  const spec = propertySpec ?? (/var\(\s*--ui-/.test(value) ? { categories: ['color', 'font', 'text', 'leading', 'weight', 'space', 'radius', 'size', 'border', 'motion', 'opacity'] } : undefined);
  if (!spec) return;
  context.checked();
  const source = `${property}:${value}`;
  const found = new Map<string, { rule: string; severity: 'error' | 'warning'; message: string; alias?: string }>();
  let aliasPath = '';
  let aliasFragments = false;
  const add = (rule: string, severity: 'error' | 'warning', message: string) => {
    const literal = /^Concrete value (.+?) in /.exec(message)?.[1];
    const concrete = literal && /^(?:#[a-f\d]{3,8}|[+-]?(?:\d*\.)?\d+(?:[a-z]+|%)?|red|blue|green|white|black|yellow|orange|purple|pink|gray|grey|cyan|magenta|transparent)$/i.test(literal);
    if (aliasFragments && (rule === 'parse-error' || rule === 'literal-token' && literal && !concrete || rule === 'unknown-token' && /Semantic token --ui-[\w-]*- is not defined/.test(message))) {
      rule = 'unresolved'; severity = 'warning'; message = 'Incomplete dynamic alias fragment: ' + message;
    }
    // An exception for a literal in the consumer must not also hide a newly
    // discovered violation supplied by another alias writer.
    const detail = severity === 'error' && aliasPath ? `${message} Via ${aliasPath}.` : message;
    const key = severity === 'error' && (aliasPath || context.separateLiteralValues && rule === 'literal-token') ? `${rule}:${detail}` : rule;
    if (!found.has(key)) found.set(key, { rule, severity, message: detail, alias: severity === 'error' && aliasPath ? aliasPath : undefined });
  };
  const parsed = valueParser(value);
  const keywords = new Set([...(spec.keywords ?? []), ...resets]);
  const isMotionShorthand = normalizedProperty === 'transition' || normalizedProperty === 'animation';
  const checkToken = (name: string, categories = spec.categories): void => {
    if (name.startsWith('--ui-p-')) add('primitive-reference', 'error', `Primitive ${name} must be accessed through a semantic token.`);
    else if (name.startsWith('--ui-')) {
      const role = context.policy.semantic[name];
      if (!role) {
        if (/^--ui-(color|font|text|leading|weight|space|radius|size|border|motion|opacity)-/.test(name)) add('unknown-token', 'error', `Semantic token ${name} is not defined in the policy.`);
        else add('unresolved', 'warning', `Local UI custom property ${name} cannot be resolved to a semantic token.`);
      }
      else if (!categories.includes(role.category)) add('token-category', 'error', `${name} (${role.category}) does not match ${normalizedProperty} (${categories.join(', ')}).`);
      else if (normalizedProperty.endsWith('-duration') || normalizedProperty.endsWith('-delay')) {
        if (role.type !== 'duration') add('token-category', 'error', `${name} is not a duration token.`);
      } else if (normalizedProperty.endsWith('-timing-function') && role.type !== 'easing') add('token-category', 'error', `${name} is not an easing token.`);
    } else add('unresolved', 'warning', `Custom property ${name} cannot be resolved to a semantic token.`);
  };
  type ValueNode = ReturnType<typeof valueParser>['nodes'][number];
  let aliasBudget = 512;
  type AliasStep = { resolve: LocalAliasResolver; name: string };
  const visit = (nodes: ValueNode[], parent = '', categories = spec.categories, coefficients = false, aliases = resolveAlias, seen: readonly AliasStep[] = []): void => {
    for (const node of nodes) {
      if (node.type === 'space' || node.type === 'comment' || node.type === 'div') continue;
      if (node.type === 'function') {
        const fn = node.value.toLowerCase();
        if (node.unclosed) add('parse-error', 'error', 'Unclosed CSS value function.');
        if (!fn && supportedMath.test(parent)) {
          const terms = node.nodes.filter(child => child.type !== 'space' && child.type !== 'comment');
          let needsOperand = true, malformed = false;
          const consume = (operator: boolean) => { if (needsOperand === operator) malformed = true; needsOperand = operator; };
          for (const term of terms) {
            if (term.type === 'div') { if (term.value !== '/') malformed = true; consume(true); }
            else if (term.type === 'word' && /^[+*\/-]$/.test(term.value)) consume(true);
            else if (term.type === 'word') {
              const attached = term.value.match(/^([*\/])?([+-]?(?:\d*\.)?\d+(?:[a-z%]+)?)([*\/+-])?$/i);
              if (attached?.[1]) consume(true);
              consume(false);
              if (attached?.[3]) consume(true);
            } else consume(false);
          }
          if (!terms.length) add('parse-error', 'error', 'Empty CSS math group.');
          else if (malformed || needsOperand) add('parse-error', 'error', 'CSS math group has a missing operand or operator.');
          visit(node.nodes, parent, categories, coefficients, aliases, seen);
          continue;
        }
        if (fn === 'var') {
          const first = node.nodes.find((item) => item.type === 'word');
          if (first) {
            const name = first.value;
            // Primitive and semantic namespaces never become local aliases, even
            // if source CSS defines a custom property with the same name.
            if (context.policy.semantic[name] || /^--ui-(p|color|font|text|leading|weight|space|radius|size|border|motion|opacity)-/.test(name) || !aliases || seen.length >= 32 || aliasBudget <= 0) checkToken(name, categories);
            else {
              const resolved = aliases(name);
              if (!resolved.complete) checkToken(name, categories);
              for (const candidate of resolved.candidates) {
                // The input resolver can aggregate several origins. A variable
                // repeats only on the candidate's stable compute environment.
                if (seen.some(step => step.resolve === candidate.resolve && step.name === name)) { checkToken(name, categories); continue; }
                if (aliasBudget-- <= 0) { checkToken(name, categories); break; }
                const previous = aliasPath;
                const previousFragments = aliasFragments;
                aliasPath = `${previous ? previous + ' -> ' : ''}${name}=${candidate.value}`;
                aliasFragments ||= !!candidate.fragments;
                visit(valueParser(candidate.value).nodes, parent, categories, coefficients, candidate.resolve, [...seen, { resolve: candidate.resolve, name }]);
                aliasPath = previous;
                aliasFragments = previousFragments;
              }
            }
          } else add('parse-error', 'error', 'var() requires a custom property.');
          const comma = node.nodes.findIndex((item) => item.type === 'div' && item.value === ',');
          if (comma >= 0) visit(node.nodes.slice(comma + 1), parent || fn, categories, coefficients, aliases, seen);
          continue;
        }
        if (fn === 'url') continue;
        if (['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'].includes(fn)) {
          if (!categories.includes('color')) add('token-category', 'error', `${fn}() color does not match ${normalizedProperty} (${categories.join(', ')}).`);
          const slash = node.nodes.findIndex(child => child.type === 'div' && child.value === '/');
          const commas = node.nodes.map((child,index) => child.type === 'div' && child.value === ',' ? index : -1).filter(index => index >= 0);
          const alpha = slash >= 0 ? slash : /^(rgba|hsla)$/.test(fn) && commas.length ? commas[commas.length-1] : -1;
          const channels = alpha < 0 ? node.nodes : node.nodes.slice(0,alpha);
          // An alpha variable cannot disguise known literal color channels.
          let dynamicChannels = false;
          valueParser(valueParser.stringify(channels)).walk(child => {
            if (child.type === 'function' && (child.value === 'var' || child.value === 'env')) dynamicChannels = true;
            if (child.type === 'word' && /\$|#\{/.test(child.value)) dynamicChannels = true;
          });
          if (!dynamicChannels) add('literal-token', 'error', `Concrete ${fn}() color needs a semantic color token.`);
          visit(channels, fn, ['color'], false, aliases, seen);
          if (alpha >= 0) visit(node.nodes.slice(alpha+1), fn, ['opacity'], false, aliases, seen);
          continue;
        }
        if (fn === 'color-mix' || /^(?:repeating-)?(?:linear|radial|conic)-gradient$/.test(fn)) {
          if (!categories.includes('color')) add('token-category', 'error', `${fn}() image/color does not match ${normalizedProperty} (${categories.join(', ')}).`);
          const args: ValueNode[][] = [[]];
          for (const child of node.nodes) {
            if (child.type === 'div' && child.value === ',') args.push([]); else args[args.length-1].push(child);
          }
          const meaningful = (items: ValueNode[]) => items.filter(item => item.type !== 'space' && item.type !== 'comment');
          const geometry = (item: ValueNode | undefined): boolean => {
            if (!item) return false;
            if (item.type === 'word') return /^[+-]?(?:\d*\.)?\d+(?:px|rem|em|%|vh|vw|ch|lh)$/.test(item.value);
            if (item.type === 'function' && item.value === 'var') {
              const name = item.nodes.find(child => child.type === 'word')?.value;
              return !!name && ['size','space'].includes(context.policy.semantic[name]?.category);
            }
            return false;
          };
          let start = 0;
          const first = meaningful(args[0])[0];
          if (fn === 'color-mix') { visit(args[0], fn, [], false, aliases, seen); start = 1; }
          else if (first?.type === 'word' && /^(to|in|from|at|circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner)$/.test(first.value) || first?.type === 'word' && /^[+-]?(?:\d*\.)?\d+(?:deg|rad|grad|turn)$/.test(first.value) || fn.includes('radial') && args.length >= 2 && geometry(first)) {
            visit(args[0], fn, ['size','space'], false, aliases, seen); start = 1;
          }
          for (let index = start; index < args.length; index++) {
            const stop = meaningful(args[index]);
            if (fn !== 'color-mix' && index > start && index < args.length-1 && stop.length === 1 && geometry(stop[0])) { visit(stop, fn, ['size','space'], false, aliases, seen); continue; }
            if (stop.length) visit([stop[0]], fn, ['color'], false, aliases, seen);
            visit(stop.slice(1), fn, fn === 'color-mix' ? ['opacity'] : ['size','space'], false, aliases, seen);
          }
          continue;
        }
        if (fn === 'env') { add('unresolved', 'warning', 'Environment-dependent CSS value cannot be statically verified.'); continue; }
        if (/^(calc|min|max|clamp|round|mod|rem|abs|sign|pow|sqrt|hypot|log|exp|sin|cos|tan|asin|acos|atan|atan2|linear-gradient|radial-gradient|conic-gradient|repeating-linear-gradient|repeating-radial-gradient|color-mix|drop-shadow|blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia|translate[xyz3d]*|scale[xyz3d]*|rotate[xyz3d]*|skew[xy]*|matrix(?:3d)?|perspective|inset|circle|ellipse|polygon|rect|fit-content|repeat|minmax|cubic-bezier|steps|linear)$/.test(fn)) {
          const lengthComposition = /^(calc|min|max|clamp)$/.test(fn) && categories.some((category) => ['space', 'size', 'border', 'text', 'radius'].includes(category));
          const functionCategories = fn === 'drop-shadow' ? ['size', 'space', 'border', 'color'] : fn === 'blur' ? ['size'] : /^(brightness|contrast|grayscale|invert|opacity|saturate|sepia)$/.test(fn) ? ['opacity'] : categories;
          const composedCategories = lengthComposition ? [...new Set([...categories, ...(categories.includes('space') ? ['size', 'border', 'text'] : []), 'leading'])] : functionCategories;
          visit(node.nodes, fn, composedCategories, supportedMath.test(fn) && (coefficients || /var\(/.test(valueParser.stringify(node.nodes))), aliases, seen);
        } else add('unresolved', 'warning', `CSS/Sass function ${node.value}() cannot be statically resolved.`);
        continue;
      }
      const word = node.value.toLowerCase();
      if (node.type === 'string') {
        if (node.unclosed) add('parse-error', 'error', 'Unclosed CSS string.');
        if (normalizedProperty === 'font-family' || normalizedProperty === 'font') add('literal-token', 'error', 'Concrete font family needs a semantic font token.');
        continue;
      }
      if (/\$|#\{|\{\{|\$\{/.test(word)) { add('unresolved', 'warning', 'Sass or dynamic CSS value cannot be statically resolved.'); continue; }
      if (word.startsWith('--')) { checkToken(word, categories); continue; }
      if (referenceOnly) continue;
      if (/^(aspect-ratio|columns|tab-size)$/.test(normalizedProperty) && /^[+]?(?:\d*\.)?\d+$/.test(word)) continue;
      if (normalizedProperty === 'animation' && !parent && (/^[+]?(?:\d*\.)?\d+$/.test(word) || /^(infinite|normal|reverse|alternate|alternate-reverse|forwards|backwards|both|running|paused)$/.test(word))) continue;
      if (/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/.test(parent) && /^(from|r|g|b|h|s|l|w|a|c|x|y|z|none|srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)$/.test(word)) continue;
      if (categories.length === 1 && categories[0] === 'opacity' && /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/.test(parent) && /^(1|100%)$/.test(word)) continue;
      if (keywords.has(word) || /^(?:[+-]?0(?:\.0+)?)(?:[a-z%]+)?$/.test(word)) continue;
      if (spec.full && word === '100%' && !parent) continue;
      if (spec.identity && /^(?:[+]?1(?:\.0+)?|100%)$/.test(word) && (!parent || /^(scale|brightness|contrast|saturate|opacity)/.test(parent))) continue;
      if (/^[+*/-]$/.test(word)) continue;
      if (normalizedProperty === 'flex' && /^[+-]?(?:\d*\.)?\d+$/.test(word)) continue;
      if (/^grid-/.test(normalizedProperty) && (/^(?:\d*\.)?\d+fr$/.test(word) || parent === 'repeat' && /^\d+$/.test(word) || parent === 'repeat' && /^(auto-fit|auto-fill)$/.test(word))) continue;
      if (/gradient$/.test(parent) || /^(rotate|skew)/.test(parent) || normalizedProperty === 'rotate') { if (/^[+-]?(?:\d*\.)?\d+(?:deg|rad|grad|turn)$/.test(word)) continue; }
      if (categories.length === 1 && categories[0] === 'opacity' && word === '100%' && (parent === 'color-mix' || /^(calc|min|max|clamp)$/.test(parent) && coefficients)) continue;
      if (coefficients && supportedMath.test(parent) && /^(?:[*\/])?[+-]?(?:\d*\.)?\d+(?:[*\/+-])?$/.test(word)) continue;
      if (parent === 'color-mix' && /^(in|srgb|srgb-linear|lab|oklab|xyz|xyz-d50|xyz-d65|hsl|hwb|lch|oklch|shorter|longer|increasing|decreasing|hue)$/.test(word)) continue;
      if (/gradient$/.test(parent) && /^(to|in|left|right|top|bottom|circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner|at|center|srgb|srgb-linear|lab|oklab|xyz|xyz-d50|xyz-d65|hsl|hwb|lch|oklch|shorter|longer|increasing|decreasing|hue)$/.test(word)) continue;
      if (isMotionShorthand && !/^(?:[+-]?(?:\d*\.)?\d+(?:[a-z%]+)?|#[\da-f]+)$/.test(word)) {
        if (normalizedProperty === 'transition' && /^(?:all|opacity|color|background(?:-color)?|border(?:-color)?|transform|width|height|[a-z]+(?:-[a-z]+)+)$/.test(word) && !/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)$/.test(word)) continue;
        // animation names are identifiers, while timing/repetition/direction are token-controlled values.
        if (normalizedProperty === 'animation' && !/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|infinite|normal|reverse|alternate|alternate-reverse|forwards|backwards|both|running|paused)$/.test(word)) continue;
      }
      add('literal-token', 'error', `Concrete value ${node.value} in ${normalizedProperty} needs a semantic token or a justified exception.`);
    }
  };
  visit(parsed.nodes);
  for (const issue of found.values()) context.emit(diagnostic(location, issue.rule, issue.severity, issue.message, issue.rule === 'unresolved' ? 'Review this unresolved value; use an explicit semantic token where possible.' : 'Use a semantic token of the matching category, or record a narrow reasoned exception.', source + (issue.alias ? ' :: ' + issue.alias : '')));
}

type SelectorScope = { anchors: string[]; terminal: string[]; required: string[]; wildcard: boolean; excluded: string[]; selector: string; conditions: string[]; simple: boolean; controlled: boolean; subjectKnown: boolean; pseudoElement?: string };

const unknownScope = (): SelectorScope => ({ anchors: [], terminal: [], required: [], wildcard: true, excluded: [], selector: '', conditions: [], simple: false, controlled: false, subjectKnown: false });

/** A source scope is an explicit selector chain, never a cascade winner. */
function selectorScopes(rule: postcss.Rule | undefined): SelectorScope[] {
  if (!rule) return [unknownScope()];
  try {
    const result: SelectorScope[] = [];
    selectorParser(selectors => {
      for (const selector of selectors.nodes) {
        const anchors: string[] = [];
        let base: string[] = [], terminal: string[] = [], required: string[] = [], terminalRequired: string[] = [], wildcard = false, terminalWildcard = false, excluded: string[] = [], terminalExcluded: string[] = [], qualified = false, controlled = rule.parent?.type !== 'rule', subjectKnown = rule.parent?.type !== 'rule', pseudoElement: string | undefined, terminalPseudoElement: string | undefined;
        const finish = () => {
          // Even an uncertain compound selector can supply a known candidate.
          // Its uncertainty must not discard the anchors used to inspect it.
          terminal = base; terminalRequired = required; terminalWildcard = wildcard; terminalExcluded = excluded; anchors.push(...base);
          if (base.length !== 1) controlled = false;
          terminalPseudoElement = pseudoElement;
          base = []; required = []; wildcard = false; excluded = []; pseudoElement = undefined;
        };
        for (const node of selector.nodes) {
          if (node.type === 'combinator') { finish(); subjectKnown = false; if (!/^\s*$|^\s*>\s*$/.test(node.value)) controlled = false; }
          else if (node.type === 'class' || node.type === 'id' || node.type === 'tag') { const anchor = `${node.type}:${node.value}`; base.push(anchor); required.push(anchor); if (node.type === 'tag' && node.namespace) { controlled = false; subjectKnown = false; } }
          else if (node.type === 'pseudo') {
            if (node.value.startsWith('::') || /^:(before|after|first-line|first-letter)$/i.test(node.value)) pseudoElement = node.value.toLowerCase().replace(/^:(?!:)/, '::');
            if (node.value === ':host') {
              base.push(':host'); required.push(':host');
              if (node.nodes?.length) { qualified = true; subjectKnown = false; }
              // A single host argument has necessary tag/class/id constraints.
              // Alternatives and relationships remain uncertain rather than
              // combining mutually exclusive host facts.
              if (node.nodes?.length === 1 && node.nodes[0].nodes.every(child => ['class', 'id', 'tag', 'attribute', 'comment'].includes(child.type))) {
                for (const child of node.nodes[0].nodes) if (child.type === 'class' || child.type === 'id' || child.type === 'tag') {
                  const anchor = `${child.type}:${child.value}`; base.push(anchor); required.push(anchor);
                }
              }
              if (node.nodes?.some(branch => branch.nodes.some(child => child.type !== 'attribute'))) controlled = false;
            } else {
              qualified = true;
              // Functional selectors retain possible anchors for candidate
              // inspection, while their coverage stays uncertain.
              if (node.value === ':not') {
                if (node.nodes?.length !== 1 || node.nodes[0].nodes.length !== 1 || !['class', 'id', 'tag'].includes(node.nodes[0].nodes[0].type)) subjectKnown = false;
                for (const branch of node.nodes ?? []) if (branch.nodes.length === 1) {
                  const child = branch.nodes[0];
                  if (child.type === 'class' || child.type === 'id' || child.type === 'tag') excluded.push(`${child.type}:${child.value}`);
                  if (child.type === 'tag' && child.namespace) subjectKnown = false;
                }
              } else if (node.nodes?.length) {
                subjectKnown = false;
                node.walk(child => { if (child.type === 'class' || child.type === 'id' || child.type === 'tag') base.push(`${child.type}:${child.value}`); });
                for (const branch of node.nodes) if (!branch.nodes.some(child => child.type === 'class' || child.type === 'id' || child.type === 'tag')) wildcard = true;
              }
              if (node.nodes?.length && (node.value !== ':not' || node.nodes.some(branch => branch.nodes.some(child => child.type !== 'attribute')))) controlled = false;
            }
          } else if (node.type === 'attribute') { qualified = true; subjectKnown = false; }
          else if (node.type !== 'comment') { controlled = false; subjectKnown = false; }
        }
        finish(); result.push({ anchors, terminal, required: terminalRequired, wildcard: terminalWildcard, excluded: terminalExcluded, selector: selector.toString(), conditions: [], simple: anchors.length === 1 && !qualified, controlled, subjectKnown, pseudoElement: terminalPseudoElement });
      }
    }).processSync(rule.selector);
    // Sass/control at-rules cannot establish a statically known selector scope.
    for (let parent: postcss.Node | undefined = rule.parent; parent; parent = parent.parent) if (parent.type === 'atrule') {
      const atRule = parent as postcss.AtRule;
      for (const scope of result) {
        if (!/^(media|container|supports|layer)$/.test(atRule.name)) scope.controlled = false;
        // A conditional definition may be inspected outside its condition, but
        // cannot prove that the consumer always has a value there.
        if (atRule.name !== 'layer') scope.conditions.push(`${atRule.name}:${atRule.params}`);
      }
    }
    return result;
  } catch { return [unknownScope()]; }
}

function stylesheetAliases(root: postcss.Root, context: StyleContext, scss: boolean, sourceOrigin?: CustomPropertyOrigin, layer: AliasLayer = 'all'): (scopes: SelectorScope[]) => LocalAliasResolver {
  // Detached subject selectors have no stylesheet ancestry. Cache their syntax
  // only, never owner facts, candidate values, coverage or cascade decisions.
  const factScopeCache = new Map<string, SelectorScope[]>();
  const factScopes = (selector: string): SelectorScope[] => {
    let scopes = factScopeCache.get(selector);
    if (!scopes) { scopes = selectorScopes(postcss.rule({ selector })); factScopeCache.set(selector, scopes); }
    return scopes;
  };
  const definitions = new Map<string, { value: string; scopes: SelectorScope[]; candidateOnly: boolean }[]>();
  const collect = (sheet: postcss.Root, candidateOnly: boolean) => sheet.walkDecls(node => {
    if (!node.prop.startsWith('--')) return;
    // Merely declaring a Sass function/mixin does not emit its body. Includes
    // remain Unknown; reading declarations is not Sass expansion.
    for (let parent: postcss.Node | undefined = node.parent; parent; parent = parent.parent) if (parent.type === 'atrule' && /^(mixin|function)$/.test((parent as postcss.AtRule).name)) return;
    const scopes = selectorScopes(node.parent?.type === 'rule' ? node.parent as postcss.Rule : undefined);
    const entries = definitions.get(node.prop) ?? [];
    entries.push({ value: node.value, scopes, candidateOnly }); definitions.set(node.prop, entries);
  });
  collect(root, false);
  for (const sibling of context.siblingStyles ?? []) {
    // Each unit is checked independently at its own source location. A malformed
    // sibling must not turn a valid consumer into a duplicate parse failure.
    try { collect(sibling.scss ? scssParser.parse(sibling.css) : postcss.parse(sibling.css), true); } catch { /* Reported by that unit's checkCSS. */ }
  }
  // Registered properties may opt out of inheritance or supply independent
  // initial values. Do not infer host-to-pseudo coverage through registrations.
  const registered = new Set<string>(context.registeredCustomProperties);
  root.walkAtRules('property', node => { registered.add(node.params.trim()); });
  type RuntimeEntry = NonNullable<StyleContext['scopedCustomProperties']>[number];
  type SubjectFacts = Pick<RuntimeEntry, 'subjectSelectors' | 'partialSubject' | 'subjectClassesUnknown' | 'subjectIdUnknown' | 'subjectOptionalSelectors'>;
  const hostFacts = (origin: NonNullable<RuntimeEntry['origin']>): SubjectFacts => ({ subjectSelectors: origin.selectors, partialSubject: true,
    subjectClassesUnknown: origin.subjectClassesUnknown, subjectIdUnknown: origin.subjectIdUnknown, subjectOptionalSelectors: origin.subjectOptionalSelectors });
  const mutableSubjectAnchor = (entry: SubjectFacts, anchor: string): boolean => !!entry.subjectClassesUnknown && anchor.startsWith('class:')
    || !!entry.subjectIdUnknown && anchor.startsWith('id:')
    || !!entry.subjectOptionalSelectors?.some(selector => factScopes(selector).some(scope => scope.terminal.includes(anchor)));
  const subjectPossible = (entry: SubjectFacts, scope: SelectorScope): boolean => {
    const subjects = entry.subjectSelectors;
    if (!subjects) return true;
    // Native subject facts cover tag/class/id constraints, never attributes,
    // functional selector evaluation, or relationships to other elements.
    if (!scope.subjectKnown && !entry.partialSubject) return false;
    const anchors = new Set(subjects.flatMap(selector => factScopes(selector).flatMap(subject => subject.terminal)));
    const mutable = (anchor: string) => mutableSubjectAnchor(entry, anchor);
    return scope.required.every(anchor => mutable(anchor) || anchors.has(anchor)) && !scope.excluded.some(anchor => !mutable(anchor) && anchors.has(anchor));
  };
  const runtimeMatches = (entry: RuntimeEntry, scope: SelectorScope): boolean => {
    const selector = entry.selector;
    if (!subjectPossible(entry, scope)) return false;
    if (!scope.controlled) return false;
    if (selector === ':host') return !!context.componentStyles && scope.anchors.length === 1 && scope.terminal[0] === ':host';
    // Native producer proofs deliberately cover only the exact selector whose
    // matching template consumers the scanner has enumerated.
    return selector === scope.selector && scope.simple;
  };
  const runtimePossible = (entry: RuntimeEntry, scope: SelectorScope): boolean => {
    const selector = entry.selector;
    if (!subjectPossible(entry, scope)) return false;
    // Host metadata can supply descendants, but inheritance never proves
    // coverage. Recursion evaluates its expression at the host, before transfer.
    if (selector === ':host') {
      if (context.componentStyles) return true;
      if (!entry.origin?.host) return false;
      return subjectPossible(hostFacts(entry.origin), scope) || !!context.nativeSubjects?.some(subject => !subject.hostDetached && subject.applicationId === entry.applicationId && subjectPossible(hostFacts(subject), scope));
    }
    // Unknown class/id values can introduce anchors absent from the template.
    // Anchor-free and relational qualifiers remain possible candidates only.
    if (entry.partialSubject || entry.subjectClassesUnknown || entry.subjectIdUnknown || entry.subjectOptionalSelectors?.length) {
      const mutableAnchor = scope.anchors.some(anchor => mutableSubjectAnchor(entry, anchor));
      if (mutableAnchor || !scope.required.length) return true;
    }
    const producer = factScopes(selector);
    return producer.length === 1 && producer[0].simple && producer[0].controlled && producer[0].terminal.some(anchor => scope.anchors.includes(anchor) || scope.wildcard && !scope.required.length);
  };
  const identities = new WeakMap<object, number>();
  let nextIdentity = 1;
  const identity = (value?: object) => { if (!value) return 0; let id = identities.get(value); if (!id) { id = nextIdentity++; identities.set(value, id); } return id; };
  const resolverCache = new Map<string, LocalAliasResolver>();
  const fallbackHosts = new Map<object | undefined, CustomPropertyOrigin>();
  const create = (scopes: SelectorScope[], subjectId?: object, hostOrigin?: RuntimeEntry['origin'], applicationId?: object, queryLayer: AliasLayer = 'all'): LocalAliasResolver => {
    const key = `${identity(applicationId)}:${identity(subjectId)}:${identity(hostOrigin)}:${queryLayer}:${JSON.stringify(scopes)}`;
    const cached = resolverCache.get(key); if (cached) return cached;
    const query: LocalAliasResolver = name => {
      // Alias recursion knows the complete native subject, not merely whichever
      // tag/class anchor happened to select its first value.
      const localRecords = (context.scopedCustomProperties ?? []).filter(entry => (queryLayer !== 'own' || !entry.incomingHost)
        && (!applicationId || !entry.applicationId || entry.applicationId === applicationId));
      const nativeSubject = subjectId && context.nativeSubjects?.find(entry => entry.subjectId === subjectId && (!applicationId || entry.applicationId === applicationId));
      const receivingHost = context.hostSubjects?.find(host => host.applicationId === applicationId);
      // Runtime host bindings describe their compute origin with :host alone.
      // Reattach the actual host facts for this application before following
      // dependencies, including both positive and excluded class/id constraints.
      const actualHost = hostOrigin && applicationId && receivingHost ? receivingHost : hostOrigin;
      const subject: SubjectFacts | undefined = actualHost ? hostFacts(actualHost) : subjectId && (localRecords.find(entry => entry.subjectId === subjectId && !entry.inherited && entry.partialSubject)
        ?? localRecords.find(entry => entry.subjectId === subjectId && !entry.inherited)
        ?? (nativeSubject ? hostFacts(nativeSubject) : undefined));
      if (!fallbackHosts.has(applicationId)) fallbackHosts.set(applicationId, { selectors: [':host'], host: true, applicationId });
      const hostComputeOrigin = receivingHost ?? hostOrigin ?? fallbackHosts.get(applicationId)!;
      const entries = definitions.get(name) ?? [];
      const candidates: { value: string; resolve: LocalAliasResolver; fragments?: boolean }[] = [];
      const selected = new Map<(typeof entries)[number], Set<SelectorScope>>();
      const writesKnown = context.customPropertyWrites !== undefined && context.customPropertyWrites !== 'unknown';
      let complete = !scss && scopes.every(scope => scope.controlled) && writesKnown && !registered.has(name);
      // This resolver belongs to the parent template's actual receiving element.
      // Preserve each returned dependency resolver instead of re-evaluating its
      // inherited expression with the child's stylesheet or native values.
      const supplySubject = actualHost ? scopes.some(scope => subjectPossible(hostFacts(actualHost), scope))
        : nativeSubject ? scopes.some(scope => subjectPossible(hostFacts(nativeSubject), scope))
        : !!receivingHost && scopes.some(scope => subjectPossible(hostFacts(receivingHost), scope)
          || context.nativeSubjects?.some(native => !native.hostDetached && native.applicationId === applicationId && subjectPossible(hostFacts(native), scope)));
      if (nativeSubject?.untrackedSupply || receivingHost?.untrackedSupply && !nativeSubject?.hostDetached && supplySubject) complete = false;
      if (queryLayer !== 'own' && receivingHost?.supply && !nativeSubject?.hostDetached && supplySubject && !(registered.has(name) && (subjectId || scopes.every(scope => !!scope.pseudoElement)))) {
        const supplied = receivingHost.supply(name);
        candidates.push(...supplied.candidates);
        if (supplied.candidates.length) complete = false;
      }
      if (queryLayer === 'all' && nativeSubject?.sameHost && supplySubject && !(registered.has(name) && scopes.every(scope => !!scope.pseudoElement))) {
        const supplied = nativeSubject.sameHost(name);
        candidates.push(...supplied.candidates);
        if (supplied.candidates.length) complete = false;
      }
      if (queryLayer === 'all' && nativeSubject && !nativeSubject.hostDetached && !registered.has(name)) {
        const inherited = context.hostInheritance?.get(nativeSubject)?.(name);
        if (inherited?.candidates.length) {
          candidates.push(...inherited.candidates);
          complete = false;
        }
      }
      // Stylesheet values compute on their matching element before inheritance.
      // Keep each real ancestor's identity and application through alias recursion;
      // a child or unrelated sibling must not supply its dependencies.
      if (!registered.has(name)) for (const ancestor of nativeSubject?.nativeAncestors ?? []) {
        if (ancestor.untrackedSupply) complete = false;
        // The ancestor may itself be a component's physical receiving host.
        // Its peer values compute there before inheritance to this consumer;
        // keep their dependency resolvers instead of reading the leaf's values.
        const supplied = ancestor.sameHost?.(name);
        if (supplied?.candidates.length) { candidates.push(...supplied.candidates); complete = false; }
        for (const entry of entries) for (const definition of entry.scopes) {
          if (!definition.subjectKnown || definition.pseudoElement || definition.terminal.includes(':host')
            || !subjectPossible(hostFacts(ancestor), definition)) continue;
          candidates.push({ value: entry.value, resolve: create([definition], ancestor.subjectId, undefined, ancestor.applicationId) });
          complete = false;
        }
        // Foreign global sheets keep their values as subject-scoped runtime
        // records, rather than being copied into this owner's definitions.
        for (const entry of localRecords) if (entry.name === name && entry.subjectId === ancestor.subjectId && !entry.inherited) {
          for (const value of entry.values) candidates.push({ value,
            resolve: create(ancestor.selectors.flatMap(factScopes), ancestor.subjectId, undefined, ancestor.applicationId),
            fragments: !!entry.fragments && !entry.wholeValues?.includes(value) });
          complete = false;
        }
      }
      const selectedRuntime = new Set<NonNullable<StyleContext['scopedCustomProperties']>[number]>();
      for (const scope of scopes) {
        // Real host selectors may also describe a native child. Only host records
        // can supply a host expression; CSS definitions still use all host facts.
        const available = localRecords.filter(entry => entry.name === name && (hostOrigin ? entry.selector === ':host' : !subjectId || entry.subjectId === subjectId || entry.selector === ':host' && !nativeSubject?.hostDetached));
        const runtime = available.filter(entry => runtimeMatches(entry, scope));
        const runtimeCovered = runtime.length > 0 && runtime.every(entry => entry.complete && entry.values.length > 0 && entry.values.every(value => !!value.trim() && !resets.has(value.trim().toLowerCase())));
        for (const entry of available) {
          const ownHost = !!hostOrigin || !subjectId && (scope.terminal.includes(':host') || !context.componentStyles && !!entry.origin?.host && subjectPossible(hostFacts(entry.origin), scope));
          if (!((entry.inherited || scope.pseudoElement || entry.selector === ':host' && !ownHost) && registered.has(name)) && runtimePossible(entry, scope)) selectedRuntime.add(entry);
        }
        if (runtime.length && !runtimeCovered || writesKnown && context.customPropertyWrites !== 'unknown' && context.customPropertyWrites?.has(name) && !runtimeCovered) complete = false;
        let covered = runtimeCovered;
        for (const entry of entries) {
          let applies = false;
          for (const definition of entry.scopes) {
            // None styles are not shimmed into this component's own host.
            // A shared :host rule can concern an enclosing shadow root, whose
            // identity is not established by these global component facts.
            if (!context.componentStyles && definition.terminal.includes(':host')) continue;
            const inheritedHost = !!context.componentStyles && definition.terminal.includes(':host') && !scope.terminal.includes(':host');
            if (inheritedHost && nativeSubject?.hostDetached) continue;
            if (context.componentStyles && hostOrigin && !definition.terminal.includes(':host')) continue;
            // A sibling unit has no shared root to establish an unattached CSS
            // subject. Known native subjects must satisfy both selectors; absent
            // matches cannot be replaced by combining sibling element facts.
            if (entry.candidateOnly && context.componentStyles && !subject && !scope.terminal.includes(':host') && !inheritedHost) continue;
            // A pseudo's value cannot flow back to its originating element or
            // across to a different pseudo. Native-to-pseudo transfer is inheritance.
            if (definition.pseudoElement && definition.pseudoElement !== scope.pseudoElement || !definition.pseudoElement && scope.pseudoElement && registered.has(name)) continue;
            if (inheritedHost && registered.has(name)) continue;
            if (!definition.controlled) complete = false;
            const excludedSubject = scope.simple && definition.excluded.some(anchor => scope.terminal.includes(anchor));
            const subjectAnchors = definition.required.length ? definition.required : definition.terminal;
            const possible = inheritedHost && receivingHost ? subjectPossible(hostFacts(receivingHost), definition)
              : subject ? inheritedHost || subjectPossible({ ...subject, partialSubject: true }, definition)
              : !excludedSubject && ((!definition.required.length && definition.wildcard) || !subjectAnchors.length || subjectAnchors.some(base => base === ':host' ? context.componentStyles : scope.anchors.includes(base)));
            if (possible) {
              applies = true;
              const applicableScopes = selected.get(entry) ?? new Set<SelectorScope>();
              applicableScopes.add(definition); selected.set(entry, applicableScopes);
              const conditionsCover = definition.conditions.every(condition => scope.conditions.includes(condition));
              const mutableConstraint = !!subject && [...definition.required, ...definition.excluded].some(anchor => mutableSubjectAnchor(subject, anchor));
              const subjectCertain = !subject || !inheritedHost && !mutableConstraint && subjectPossible({ ...subject, partialSubject: false, subjectClassesUnknown: false, subjectIdUnknown: false, subjectOptionalSelectors: [] }, definition);
              if (!entry.candidateOnly && definition.controlled && conditionsCover && subjectCertain && (definition.simple || definition.selector === scope.selector)) covered = true;
            }
          }
          if (applies && resets.has(entry.value.trim().toLowerCase())) complete = false;
        }
        if (!covered) complete = false;
      }
      for (const [entry, applicableScopes] of selected) {
        if (subjectId) for (const scope of applicableScopes) candidates.push({ value: entry.value, resolve: create([scope], scope.terminal.includes(':host') ? undefined : subjectId,
          scope.terminal.includes(':host') ? hostComputeOrigin : hostOrigin, applicationId) });
        else candidates.push({ value: entry.value, resolve: create([...applicableScopes], undefined, hostOrigin, applicationId) });
      }
      for (const entry of selectedRuntime) for (const value of entry.values) {
        const originScopes = entry.origin ? entry.origin.selectors.flatMap(factScopes) : scopes;
        candidates.push({ value, resolve: create(originScopes, entry.origin ? entry.origin.subjectId : entry.subjectId ?? subjectId,
          entry.origin ? entry.origin.host ? entry.origin : undefined : hostOrigin, entry.origin?.applicationId ?? entry.applicationId ?? applicationId), fragments: !!entry.fragments && !entry.wholeValues?.includes(value) });
      }
      if (!(registered.has(name) && scopes.every(scope => scope.pseudoElement))) for (const value of context.customPropertyValues?.get(name) ?? []) candidates.push({ value, resolve: create(scopes, subjectId, hostOrigin, applicationId) });
      return { complete, candidates };
    };
    const active = new Set<string>();
    const resolver: LocalAliasResolver = name => {
      if (active.has(name)) return { complete: false, candidates: [] };
      active.add(name);
      try { return query(name); } finally { active.delete(name); }
    };
    resolverCache.set(key, resolver);
    return resolver;
  };
  return scopes => {
    if (sourceOrigin) return create(scopes, sourceOrigin.subjectId, sourceOrigin.host ? sourceOrigin : undefined, sourceOrigin.applicationId, layer);
    if (!context.hostSubjects?.length) return create(scopes);
    const resolvers = context.hostSubjects.flatMap(host => scopes.flatMap(scope => {
      if (context.componentStyles && scope.terminal.includes(':host')) return [create([scope], undefined, host, host.applicationId)];
      const subjects = context.nativeSubjects?.filter(subject => subject.applicationId === host.applicationId && subjectPossible(hostFacts(subject), scope)) ?? [];
      const native = subjects.map(subject => create([scope], subject.subjectId, undefined, host.applicationId));
      if (context.componentStyles && native.length) return native;
      if (!context.componentStyles && context.hostConsumers && !context.hostConsumers.has(host)) return native;
      // None/global selectors may consume on a real receiving native element
      // as well as on the owner's host. Keep the existing host/unattached query
      // and inspect each matched native with its own instance and dependencies.
      if (!context.componentStyles && native.length) return [create([scope], undefined, undefined, host.applicationId), ...native];
      return [create([scope], undefined, undefined, host.applicationId)];
    }));
    return name => {
      const results = resolvers.map(resolve => resolve(name));
      return { complete: results.length > 0 && results.every(result => result.complete), candidates: results.flatMap(result => result.candidates) };
    };
  };
}

/** Read source candidates on one known physical element, in that owner's CSS.
 * An empty root makes every source stylesheet candidate-only. */
export function customPropertyResolver(context: StyleContext, origin: CustomPropertyOrigin, layer: AliasLayer = 'all'): CustomPropertyResolver {
  const scopes = origin.selectors.flatMap(selector => selectorScopes(postcss.rule({ selector })));
  return stylesheetAliases(postcss.root(), context, false, origin, layer)(scopes);
}

function stylesheetBaselineContext(node: postcss.Node): string[] {
  const context: string[] = [];
  for (let owner = node.parent; owner; owner = owner.parent) {
    if (owner.type === 'rule') context.push(JSON.stringify(['selector', (owner as postcss.Rule).selector]));
    if (owner.type === 'atrule') {
      const rule = owner as postcss.AtRule;
      context.push(JSON.stringify(['at-rule', rule.name, rule.params]));
    }
  }
  return ['Stylesheet', ...context.reverse()];
}

export function checkCSS(css: string, location: SourceLocation, context: StyleContext, scss = false): void {
  try {
    const root = scss ? scssParser.parse(css) : postcss.parse(css);
    const aliases = stylesheetAliases(root, context, scss);
    root.walkAtRules((node) => {
      if (/^(media|container)$/.test(node.name)) {
        const source = `@${node.name} ${node.params}`;
        const atLocation = { ...location, offset: location.offset + (node.source?.start?.offset ?? 0) };
        if (/\$|#\{/.test(node.params)) context.emit(diagnostic(atLocation, 'unresolved', 'warning', 'Dynamic query threshold cannot be resolved without Sass expansion.', 'Review compiled queries separately.', source));
        else if (/[+-]?(?:\d*\.)?\d+(?:px|em|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc)\b/i.test(node.params)) context.emit(withBaselineContext(diagnostic(atLocation, 'literal-token', 'error', 'Fixed query dimensions need an explicit geometry exception.', 'Record a narrow exception explaining the responsive threshold.', source), ...stylesheetBaselineContext(node)));
      }
      if (/^(mixin|include|extend|function|if|else|for|each|while|use|forward|import)$/.test(node.name) && (scss || /\$|#\{/.test(node.params))) {
        const offset = node.source?.start?.offset ?? 0;
        context.emit(diagnostic({ ...location, offset: location.offset + offset }, 'unresolved', 'warning', `Sass @${node.name} requires expansion; its resulting declarations are unverified.`, 'Review compiled styles separately or replace with statically inspectable declarations.', node.toString()));
      }
    });
    root.walkDecls((node) => {
      if (scss && node.prop.startsWith('$')) {
        context.emit(diagnostic({ ...location, offset: location.offset + (node.source?.start?.offset ?? 0) }, 'unresolved', 'warning', 'Sass variable requires expansion before its use can be verified.', 'Review compiled styles separately.', node.toString()));
        return;
      }
      const offset = node.source?.start?.offset ?? 0;
      const selector = node.parent?.type === 'rule' ? (node.parent as postcss.Rule).selector : undefined;
      const original = selector ? `${selector}{${node.toString()}}` : node.toString();
      const prefix = `${node.prop}:${node.value} :: `;
      const innerContext: StyleContext = { ...context, emit: (issue) => context.emit(withBaselineContext({ ...issue, source: original + (issue.source.startsWith(prefix) ? ' :: ' + issue.source.slice(prefix.length) : '') }, ...stylesheetBaselineContext(node))) };
      checkStyle(node.prop, node.value, { ...location, offset: location.offset + offset }, innerContext, aliases(selectorScopes(node.parent?.type === 'rule' ? node.parent as postcss.Rule : undefined)));
    });
  } catch (error) {
    const detail = error as { reason?: string; line?: number; column?: number; message?: string };
    const lines = css.split('\n');
    const relative = lines.slice(0, Math.max(0, (detail.line ?? 1) - 1)).reduce((size, line) => size + line.length + 1, 0) + (detail.column ?? 1) - 1;
    context.emit(diagnostic({ ...location, offset: location.offset + relative }, 'parse-error', 'error', detail.reason ?? detail.message ?? 'Cannot parse CSS.', 'Repair CSS syntax before rerunning the check.', css));
  }
}

/** Variant separators inside arbitrary values are part of the value, not prefixes. */
function utilityBase(utility: string): string {
  let depth = 0, start = 0;
  for (let i = 0; i < utility.length; i++) {
    if (utility[i] === '[' || utility[i] === '(') depth++;
    else if (utility[i] === ']' || utility[i] === ')') depth--;
    else if (utility[i] === ':' && depth === 0) start = i + 1;
  }
  return utility.slice(start).replace(/^!/, '').replace(/!$/, '');
}

const fallbackStaticUtilities: Record<string, [string, string]> = {
  'sr-only': ['width', '1px'], border: ['border-width', '1px'], ring: ['border-width', '1px'], outline: ['border-width', '1px'],
  rounded: ['border-radius', 'default'], shadow: ['box-shadow', 'default'], blur: ['filter', 'default'], 'backdrop-blur': ['filter', 'default'],
};
for (const name of ['grayscale', 'invert', 'sepia', 'backdrop-grayscale', 'backdrop-invert', 'backdrop-sepia']) fallbackStaticUtilities[name] = [name.startsWith('backdrop-') ? 'backdrop-filter' : 'filter', `${name.replace(/^backdrop-/, '')}(1)`];

/** One grammar source feeds both fallback dispatch and symbolic namespace proof. */
function fallbackUtilityGrammar(): { mapping: Record<string, string>; prefixes: string[] } {
  const mapping: Record<string, string> = { p: 'padding', px: 'padding-inline', py: 'padding-block', pt: 'padding-top', pr: 'padding-right', pb: 'padding-bottom', pl: 'padding-left', ps: 'padding-inline-start', pe: 'padding-inline-end', m: 'margin', mx: 'margin-inline', my: 'margin-block', mt: 'margin-top', mr: 'margin-right', mb: 'margin-bottom', ml: 'margin-left', ms: 'margin-inline-start', me: 'margin-inline-end', gap: 'gap', 'gap-x': 'column-gap', 'gap-y': 'row-gap', 'space-x': 'margin-inline', 'space-y': 'margin-block', w: 'width', h: 'height', size: 'width', 'min-w': 'min-width', 'min-h': 'min-height', 'max-w': 'max-width', 'max-h': 'max-height', basis: 'flex-basis', inset: 'inset', 'inset-x': 'inset-inline', 'inset-y': 'inset-block', top: 'top', right: 'right', bottom: 'bottom', left: 'left', start: 'inset-inline-start', end: 'inset-inline-end', leading: 'line-height', tracking: 'letter-spacing', opacity: 'opacity', duration: 'transition-duration', delay: 'transition-delay', ease: 'transition-timing-function', animate: 'animation', transition: 'transition', fill: 'fill', stroke: 'stroke', accent: 'accent-color', caret: 'caret-color', 'decoration': 'text-decoration-color', 'underline-offset': 'text-underline-offset', 'translate-x': 'translate', 'translate-y': 'translate', scale: 'scale', rotate: 'rotate', blur: 'filter', 'backdrop-blur': 'backdrop-filter', brightness: 'filter', contrast: 'filter', saturate: 'filter' };
  Object.assign(mapping, { 'grid-cols': 'grid-template-columns', 'grid-rows': 'grid-template-rows', 'auto-cols': 'grid-auto-columns', 'auto-rows': 'grid-auto-rows', 'bg-size': 'background-size', 'bg-position': 'background-position' });
  for (const [prefix, property] of Object.entries({ 'scroll-p': 'scroll-padding', 'scroll-px': 'scroll-padding-inline', 'scroll-py': 'scroll-padding-block', 'scroll-pt': 'scroll-padding-top', 'scroll-pr': 'scroll-padding-right', 'scroll-pb': 'scroll-padding-bottom', 'scroll-pl': 'scroll-padding-left', 'scroll-m': 'scroll-margin', 'scroll-mx': 'scroll-margin-inline', 'scroll-my': 'scroll-margin-block', 'scroll-mt': 'scroll-margin-top', 'scroll-mr': 'scroll-margin-right', 'scroll-mb': 'scroll-margin-bottom', 'scroll-ml': 'scroll-margin-left', 'border-spacing': 'border-spacing', 'border-spacing-x': 'border-spacing-x', 'border-spacing-y': 'border-spacing-y' })) mapping[prefix] = property;
  const prefixes = [...Object.keys(mapping), 'from', 'via', 'to', 'bg', 'text', 'font', 'shadow', 'rounded', 'rounded-s', 'rounded-e', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-ss', 'rounded-se', 'rounded-es', 'rounded-ee', 'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br', 'border', 'border-x', 'border-y', 'border-t', 'border-r', 'border-b', 'border-l', 'border-s', 'border-e', 'divide', 'divide-x', 'divide-y', 'ring-offset', 'ring', 'outline-offset', 'outline'];
  Object.assign(mapping, { block: 'block-size', inline: 'inline-size', 'min-inline': 'min-inline-size', 'max-inline': 'max-inline-size', 'min-block': 'min-block-size', 'max-block': 'max-block-size', flex: 'flex', aspect: 'aspect-ratio', object: 'object-position', placeholder: 'color', filter: 'filter', 'backdrop-filter': 'backdrop-filter', columns: 'columns', tab: 'tab-size', zoom: 'zoom', align: 'vertical-align', 'list-image': 'list-style-image', 'scrollbar-thumb': 'scrollbar-color', 'scrollbar-track': 'scrollbar-color', mask: 'mask-image', 'mask-size': 'mask-size', 'mask-position': 'mask-position', pbs: 'padding-block-start', pbe: 'padding-block-end', mbs: 'margin-block-start', mbe: 'margin-block-end', 'inset-s': 'inset-inline-start', 'inset-e': 'inset-inline-end', 'inset-bs': 'inset-block-start', 'inset-be': 'inset-block-end', translate: 'translate', 'translate-z': 'translate', perspective: 'perspective', transform: 'transform', origin: 'transform-origin', 'perspective-origin': 'perspective-origin', 'object-position': 'object-position', indent: 'text-indent', 'scale-x': 'scale', 'scale-y': 'scale', 'scale-z': 'scale', 'rotate-x': 'rotate', 'rotate-y': 'rotate', 'rotate-z': 'rotate', skew: 'transform', 'skew-x': 'transform', 'skew-y': 'transform', 'drop-shadow': 'filter', 'text-shadow': 'text-shadow', 'inset-shadow': 'box-shadow', 'inset-ring': 'outline-width' });
  for (const [axis, side] of Object.entries({ s: 'inline-start', e: 'inline-end', bs: 'block-start', be: 'block-end' })) {
    mapping[`scroll-p${axis}`] = `scroll-padding-${side}`; mapping[`scroll-m${axis}`] = `scroll-margin-${side}`;
  }
  for (const name of ['brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia', 'blur']) {
    if (name !== 'opacity') mapping[name] = 'filter'; mapping[`backdrop-${name}`] = 'backdrop-filter';
  }
  for (const direction of ['x', 'y', 't', 'r', 'b', 'l']) for (const stop of ['from', 'to']) mapping[`mask-${direction}-${stop}`] = 'mask-position';
  mapping['mask-radial-at'] = 'mask-position';
  prefixes.push(...Object.keys(mapping), 'border-bs', 'border-be', 'divide-bs', 'divide-be');
  return { mapping, prefixes };
}

export function fallbackUtilityRoots(): readonly string[] {
  return [...Object.keys(fallbackStaticUtilities), ...fallbackUtilityGrammar().prefixes];
}

function utilityProperty(base: string): [string, string] | undefined {
  if (base === 'sr-only') return fallbackStaticUtilities[base];
  const arbitraryProperty = /^\[([\w-]+):(.+)\]$/.exec(base);
  if (arbitraryProperty) return [arbitraryProperty[1], arbitraryProperty[2].replace(/_/g, ' ')];
  // Gradient payloads must pass through the same CSS value visitor as authored styles.
  const gradient = /^-?(bg|mask)-(linear|radial|conic)(?:-(.+))?$/.exec(base);
  if (gradient) {
    const [, family, kind, payload] = gradient;
    // Gradient stop utilities carry one position/color rather than a whole image.
    if (family === 'mask' && /^(from|to)(?:-|$)/.test(payload ?? '')) {
      const raw = payload!.replace(/^(from|to)-/, '');
      const type = /^[[(]([a-z-]+):/.exec(raw)?.[1];
      const value = raw.startsWith('(') ? `var(${raw.slice(1, -1).replace(/^[a-z-]+:/, '')})` : raw.startsWith('[') ? raw.slice(1, -1).replace(/^[a-z-]+:/, '').replace(/_/g, ' ') : raw;
      return [type === 'color' ? 'color' : 'mask-position', value];
    }
    if (family === 'mask' && kind === 'radial' && payload) {
      if (['circle', 'ellipse'].includes(payload)) return undefined;
      const at = payload.startsWith('at-'); const raw = at ? payload.slice(3) : payload;
      const value = raw.startsWith('(') ? `var(${raw.slice(1,-1).replace(/^[a-z-]+:/,'')})` : raw.startsWith('[') ? raw.slice(1,-1).replace(/^[a-z-]+:/,'').replace(/_/g,' ') : raw;
      return [at ? 'mask-position' : 'mask-size', value];
    }
    const imageProperty = family === 'mask' ? 'mask-image' : 'background-image';
    const functionName = `${kind}-gradient`;
    if (payload?.startsWith('[') && payload.endsWith(']')) return [imageProperty, `${functionName}(${payload.slice(1, -1).replace(/_/g, ' ')})`];
    if (payload?.startsWith('(') && payload.endsWith(')')) return [imageProperty, `${functionName}(var(${payload.slice(1, -1)}))`];
    if (kind === 'linear' && /^to-(t|tr|r|br|b|bl|l|tl)$/.test(payload ?? '')) {
      const directions: Record<string, string> = { t: 'top', tr: 'top right', r: 'right', br: 'bottom right', b: 'bottom', bl: 'bottom left', l: 'left', tl: 'top left' };
      return [imageProperty, `linear-gradient(to ${directions[payload!.slice(3)]})`];
    }
    if (/^\d+(?:\.\d+)?$/.test(payload ?? '')) return [imageProperty, `${functionName}(${base.startsWith('-') ? '-' : ''}${payload}deg)`];
    if (!payload) return [imageProperty, `${functionName}(transparent)`];
    // Unrecognized gradient payloads are inspected rather than silently trusted.
    return [imageProperty, `${functionName}(${payload})`];
  }
  const match = /^-?([a-z][a-z-]*?)-(.+)$/.exec(base);
  if (!match) return fallbackStaticUtilities[base];
  let [, prefix, suffix] = match;
  const { mapping, prefixes } = fallbackUtilityGrammar();
  const unsigned = base.replace(/^-/, '');
  const chosen = prefixes.sort((a, b) => b.length - a.length).find((item) => unsigned.startsWith(`${item}-`));
  if (chosen) { prefix = chosen; suffix = unsigned.slice(chosen.length + 1); }
  // Tailwind dispatches arbitrary values by explicit type hints, never by a
  // custom property's semantic name. Unhinted variables use each utility's default.
  const hint = /^[[(]([a-z-]+):/.exec(suffix)?.[1];
  const arbitrary = suffix.startsWith('[') && suffix.endsWith(']') ? suffix.slice(1, -1).replace(/_/g, ' ').replace(/^[a-z-]+:/, '') : undefined;
  // CSS math is inferred as a numeric/length type by Tailwind, while a bare
  // var() deliberately has no inferred type and falls back to the utility default.
  const math = arbitrary !== undefined && !arbitrary.startsWith('var(') && /\b(?:calc|min|max|clamp|mod|rem|sin|cos|tan|asin|acos|atan|atan2|pow|sqrt|hypot|log|exp|round)\(/.test(arbitrary);
  const inferredLength = math || arbitrary !== undefined && /^[+-]?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?(?:cm|mm|Q|in|pc|pt|px|em|ex|ch|rem|lh|rlh|vw|vh|vmin|vmax|vb|vi|svw|svh|lvw|lvh|dvw|dvh|cqw|cqh|cqi|cqb|cqmin|cqmax)$/.test(arbitrary);
  const inferredPercentage = arbitrary !== undefined && /^[+-]?(?:\d*\.)?\d+%$/.test(arbitrary);
  let property = mapping[prefix];
  if (prefix === 'decoration') property = hint ? ['length', 'number'].includes(hint) ? 'text-decoration-thickness' : 'text-decoration-color' : inferredLength || /^(?:\d|\[\d|auto$|from-font$)/.test(suffix) ? 'text-decoration-thickness' : 'text-decoration-color';
  if (prefix === 'stroke') property = hint ? ['length', 'number', 'percentage'].includes(hint) ? 'stroke-width' : 'stroke' : inferredLength || inferredPercentage || /^\d|^\[\d/.test(suffix) ? 'stroke-width' : 'stroke';
  if (/^mask-[xytblr]-(from|to)$/.test(prefix) && hint === 'color') property = 'color';
  if (/^(from|via|to)$/.test(prefix)) property = hint ? ['length', 'percentage'].includes(hint) ? 'background-position' : 'background-color' : inferredLength || inferredPercentage ? 'background-position' : 'background-color';
  if (prefix === 'bg') {
    if (/^(auto|cover|contain)$/.test(suffix)) return ['background-size', suffix];
    if (/^(fixed|local|scroll|clip-|origin-|repeat|no-repeat|gradient-to-|center|top|bottom|left|right|none)/.test(suffix)) return undefined;
    property = hint ? ({ image: 'background-image', length: 'background-size', size: 'background-size', 'bg-size': 'background-size', percentage: 'background-position', position: 'background-position' }[hint] ?? 'background-color') : /^\[(?:repeating-)?(?:linear|radial|conic)-gradient\(|^\[url\(/.test(suffix) ? 'background-image' : inferredLength || inferredPercentage ? 'background-position' : 'background-color';
  }
  if (prefix === 'text') {
    if (/^(left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/.test(suffix)) return undefined;
    property = hint ? ['length', 'percentage', 'absolute-size', 'relative-size'].includes(hint) ? 'font-size' : 'color' : /^(?:size-|xs(?:\/|$)|sm(?:\/|$)|base(?:\/|$)|lg(?:\/|$)|[2-9]?xl(?:\/|$))/.test(suffix) || inferredLength || inferredPercentage || arbitrary !== undefined && /^(xx?-small|small|medium|large|xx?-large|xxx-large|larger|smaller)$/.test(arbitrary) ? 'font-size' : 'color';
  }
  if (prefix === 'font') {
    property = hint ? ['family-name', 'generic-name'].includes(hint) ? 'font-family' : 'font-weight' : /^(family-|sans$|serif$|mono$)/.test(suffix) || arbitrary !== undefined && !arbitrary.startsWith('var(') && !math && !/^[\d.]/.test(arbitrary) ? 'font-family' : 'font-weight';
  }
  if (/^rounded(?:-(?:s|e|t|r|b|l|ss|se|es|ee|tl|tr|bl|br))?$/.test(prefix)) property = 'border-radius';
  if (/^divide-(x|y)$/.test(prefix) && suffix === 'reverse') return undefined;
  if (prefix === 'ring' && suffix === 'inset') return undefined;
  if (/^(?:border|divide)(?:-(?:x|y|t|r|b|l|s|e|bs|be))?$/.test(prefix)) {
    if (borderStyles.includes(suffix)) return undefined;
    property = hint ? hint === 'length' ? 'border-width' : 'border-color' : inferredLength || /^(?:\d+|\[\d.*\])$/.test(suffix) ? 'border-width' : 'border-color';
  }
  if (/^(ring|ring-offset|outline|outline-offset)$/.test(prefix)) {
    if (borderStyles.includes(suffix)) return undefined;
    property = prefix === 'outline-offset' ? 'outline-width' : hint ? hint === 'length' ? 'outline-width' : 'outline-color' : inferredLength || /^(?:\d+|\[\d.*\])$/.test(suffix) ? 'outline-width' : 'outline-color';
  }
  if (['shadow','text-shadow','inset-shadow','drop-shadow'].includes(prefix) && hint === 'color') property = 'color';
  if (prefix === 'inset-ring' && hint === 'color') property = 'outline-color';
  if (!property) return undefined;
  let value = suffix;
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1).replace(/_/g, ' ').replace(/^(color|length|number|percentage|family-name|generic-name|absolute-size|relative-size|image|url|size|bg-size|position):/, '');
  else if (value.startsWith('(') && value.endsWith(')')) value = `var(${value.slice(1, -1).replace(/^(color|length|number|percentage|family-name|generic-name|absolute-size|relative-size|image|url|size|bg-size|position):/, '')})`;
  else if (/^color-/.test(value)) value = `var(--ui-color-${value.slice(6)})`;
  else if (/^size-/.test(value)) value = `var(--ui-${property === 'font-size' ? 'text' : 'size'}-${value.slice(5)})`;
  else if (prefix === 'font' && value.startsWith('family-')) value = `var(--ui-font-${value.slice(7)})`;
  else if (prefix === 'font' && value.startsWith('weight-')) value = `var(--ui-weight-${value.slice(7)})`;
  else if (/^(p(?:[xytrblse]|bs|be)?|m(?:[xytrblse]|bs|be)?|gap(?:-[xy])?|space-[xy]|scroll-[pm](?:[xytrblse]|bs|be)?|border-spacing(?:-[xy])?)$/.test(prefix) && !/^\d|auto$/.test(value)) value = `var(--ui-space-${value})`;
  else if (prefix === 'leading' && !/^\d|none$|tight$|snug$|normal$|relaxed$|loose$/.test(value)) value = `var(--ui-leading-${value})`;
  else if (prefix.startsWith('rounded') && !/^(none|sm|md|lg|xl|[2-4]xl|full)$/.test(value)) value = `var(--ui-radius-${value})`;
  if (/^grid-(cols|rows)$/.test(prefix) && /^\d+$/.test(value)) value = `repeat(${value},minmax(0,1fr))`;
  if (/^auto-(cols|rows)$/.test(prefix) && value === 'fr') value = 'minmax(0,1fr)';
  if (/^auto-(cols|rows)$/.test(prefix) && value === 'min') value = 'min-content';
  if (/^auto-(cols|rows)$/.test(prefix) && value === 'max') value = 'max-content';
  if (prefix === 'aspect' && value === 'square') value = '1/1';
  if (prefix === 'aspect' && value === 'video') value = '16/9';
  if (value === 'full' && /^(width|height|.*-width|.*-height)$/.test(property)) value = '100%';
  if (value === 'min' && /width|height/.test(property)) value = 'min-content';
  if (value === 'max' && /width|height/.test(property)) value = 'max-content';
  if (value === 'fit' && /width|height/.test(property)) value = 'fit-content';
  if (value === 'none' && property === 'border-radius') value = '0';
  if (property === 'opacity' && value === '100') value = '1';
  if (/^scale(?:-[xyz])?$/.test(prefix) && /^\d+(?:\.\d+)?$/.test(value)) value = String(Number(value) / 100);
  if (/^(rotate(?:-[xyz])?|skew(?:-[xy])?|hue-rotate|backdrop-hue-rotate)$/.test(prefix) && /^\d+(?:\.\d+)?$/.test(value)) value += 'deg';
  if (/^skew(?:-[xy])?$/.test(prefix)) value = `${prefix === 'skew-x' ? 'skewX' : prefix === 'skew-y' ? 'skewY' : 'skew'}(${value})`;
  if (prefix !== 'opacity' && !(prefix === 'drop-shadow' && hint === 'color') && /^(?:backdrop-)?(?:blur|brightness|contrast|grayscale|hue-rotate|invert|opacity|saturate|sepia|drop-shadow)$/.test(prefix)) {
    const fn = prefix.replace(/^backdrop-/, '');
    if (fn !== 'blur' && fn !== 'drop-shadow' && fn !== 'hue-rotate' && /^\d+(?:\.\d+)?$/.test(value)) value = String(Number(value) / 100);
    value = `${fn}(${value})`;
  }
  if (base.startsWith('-')) value = `calc(-1 * ${value})`;
  return [property, value];
}

export function checkClasses(classes: string, location: SourceLocation, context: StyleContext, localClasses?: Set<string>): void {
  for (const match of classes.matchAll(/\S+/g)) {
    const utility = match[0];
    const currentLocation = { ...location, offset: location.offset + (match.index ?? 0) };
    if (localClasses?.has(utility)) continue;
    const base = utilityBase(utility);
    const emitted = new Set<string>();
    const emit = (issue: SourceDiagnostic) => { if (!emitted.has(issue.rule)) { emitted.add(issue.rule); context.emit({ ...issue, source: utility }); } };
    // Named breakpoints are adopted framework structure. Explicit arbitrary
    // media/container dimensions are authored values and need the usual inspection.
    let depth = 0, begin = 0;
    for (let index = 0; index < utility.length; index++) {
      const character = utility[index];
      if (character === '[' || character === '(') depth++;
      else if (character === ']' || character === ')') depth--;
      else if (character === ':' && depth === 0) {
        const variant = utility.slice(begin, index);
        for (const threshold of context.utilities?.variantThresholds(variant) ?? []) {
          checkStyle('width', threshold, currentLocation, { ...context, emit });
        }
        begin = index + 1;
      }
    }
    let compiled: [string, string][] | undefined;
    try { compiled = context.utilities?.(base); }
    catch (error) {
      emit(diagnostic(currentLocation, 'parse-error', 'error', `Cannot parse utility: ${error instanceof Error ? error.message : String(error)}`, 'Repair the utility syntax before rerunning the check.', utility));
      continue;
    }
    if (compiled) {
      for (const [property, value] of compiled) checkStyle(property, value, currentLocation, { ...context, emit });
      continue;
    }
    const mapped = utilityProperty(base.replace(/\/(\d+|\[.+\])$/, ''));
    if (mapped) {
      checkStyle(mapped[0], mapped[1], currentLocation, { ...context, emit });
      // Tailwind slash modifiers are independent opacity/leading values.
      const slash = /\/(\d+|\[.+\])$/.exec(base);
      if (slash) checkStyle(mapped[0] === 'font-size' ? 'line-height' : 'opacity', mapped[0] === 'font-size' ? slash[1].replace(/^\[|\]$/g, '') : /^\d+$/.test(slash[1]) ? String(Number(slash[1]) / 100) : slash[1].replace(/^\[|\]$/g, ''), currentLocation, { ...context, emit });
    }
  }
}


/** Local utility-shaped names are trusted only when present in parsed rule selectors. */
export function collectLocalClasses(css: string, scss = false): Set<string> {
  const classes = new Set<string>();
  try {
    const root = scss ? scssParser.parse(css) : postcss.parse(css);
    root.walkRules((rule) => {
      // Sass interpolation/parent expansion must not manufacture an approval.
      let ancestor: postcss.Container | postcss.Document | undefined = rule;
      while (ancestor) {
        if (ancestor.type === 'rule') {
          const selector = (ancestor as postcss.Rule).selector;
          if (/\$|#\{/.test(selector) || scss && selector.includes('&')) return;
        }
        if (scss && ancestor.type === 'atrule') {
          const at = ancestor as postcss.AtRule;
          if (/^(mixin|function|if|else|for|each|while)$/.test(at.name) || /\$|#\{/.test(at.params)) return;
        }
        ancestor = ancestor.parent;
      }
      try {
        selectorParser((selectors) => {
          selectors.walkClasses((node) => { classes.add(node.value); });
        }).processSync(rule.selector);
      } catch {
        // An unparseable selector grants no approvals; CSS diagnostics remain separate.
      }
    });
  } catch {
    // A failed stylesheet grants no approvals; checkCSS reports its parse error.
  }
  return classes;
}
