export type PrimitiveType = 'color' | 'length' | 'fontFamily' | 'number' | 'duration' | 'easing';

/** The component contract. Additional roles may use the same categories. */
export const CORE_ROLES: Readonly<Record<string, PrimitiveType>> = {
  'color.text': 'color', 'color.muted': 'color', 'color.surface': 'color',
  'color.background': 'color', 'color.border': 'color', 'color.action': 'color',
  'color.action-hover': 'color', 'color.on-action': 'color',
  'color.link': 'color', 'color.tab-selected': 'color', 'color.danger': 'color',
  'color.danger-hover': 'color', 'color.on-danger': 'color', 'color.success': 'color',
  'color.success-surface': 'color', 'color.warning': 'color', 'color.warning-surface': 'color',
  'color.error-surface': 'color', 'color.focus': 'color', 'color.disabled-surface': 'color',
  'color.backdrop': 'color', 'color.shadow': 'color', 'font.body': 'fontFamily', 'font.code': 'fontFamily',
  'text.body': 'length', 'text.small': 'length', 'text.heading': 'length', 'text.avatar': 'length',
  'leading.body': 'number', 'leading.heading': 'number', 'leading.control': 'number',
  'weight.body': 'number', 'weight.heading': 'number', 'weight.control': 'number',
  'space.page': 'length', 'space.section': 'length', 'space.field': 'length',
  'space.control-x': 'length', 'space.control-y': 'length', 'space.control-gap': 'length',
  'space.table-x': 'length', 'space.table-y': 'length',
  'radius.control': 'length', 'radius.surface': 'length',
  'size.control': 'length', 'size.icon': 'length', 'size.dialog': 'length', 'size.content': 'length',
  'size.table-column-min': 'length', 'size.table-viewport': 'length',
  'size.input-max-height': 'length', 'size.form-label': 'length',
  'size.grid-item': 'length', 'size.sidebar': 'length', 'size.avatar': 'length',
  'size.elevation-blur': 'length', 'size.overlay-min': 'length', 'size.dialog-min': 'length',
  'size.drawer-inline': 'length', 'size.drawer-block': 'length', 'size.navigation-rail': 'length',
  'size.mega-menu': 'length', 'size.navigation-column': 'length', 'size.knob': 'length',
  'size.collection-item': 'length', 'size.collection-viewport': 'length',
  'size.media-viewport': 'length',
  'size.visualization-viewport': 'length',
  'border.control': 'length', 'border.focus': 'length', 'border.focus-offset': 'length',
  'motion.duration': 'duration', 'motion.easing': 'easing', 'opacity.watermark': 'number', 'opacity.map-region': 'number',
};

/** Optional visual roles resolve against the same profile's existing semantic reference.
 * Keep them outside CORE_ROLES: old application YAML remains valid. */
export const OPTIONAL_ROLE_FALLBACKS: Readonly<Record<string, string>> = {
  'text.page-title': 'text.heading',
  'text.section-title': 'text.heading',
  'text.subheading': 'text.body',
};

export function withOptionalRoleFallbacks(references: Readonly<Record<string, string>>): Record<string, string> {
  const resolved = { ...references };
  for (const [role, fallback] of Object.entries(OPTIONAL_ROLE_FALLBACKS)) {
    if (!Object.hasOwn(resolved, role) && Object.hasOwn(resolved, fallback)) resolved[role] = resolved[fallback];
  }
  return resolved;
}

export const CATEGORY_TYPES: Readonly<Record<string, readonly PrimitiveType[]>> = {
  color: ['color'], font: ['fontFamily'], text: ['length'], leading: ['number'], weight: ['number'],
  space: ['length'], radius: ['length'], size: ['length'], border: ['length'],
  motion: ['duration', 'easing'], opacity: ['number'],
};

/** Only these component text/background pairs are checked; this is not a UX/a11y certification. */
export const CONTRAST_PAIRS: readonly (readonly [string, string])[] = [
  ['color.text', 'color.surface'], ['color.text', 'color.background'],
  ['color.text', 'color.disabled-surface'],
  ['color.muted', 'color.surface'], ['color.muted', 'color.background'],
  ['color.muted', 'color.disabled-surface'],
  ['color.on-action', 'color.action'], ['color.on-action', 'color.action-hover'],
  ['color.link', 'color.surface'], ['color.link', 'color.background'],
  ['color.tab-selected', 'color.surface'],
  ['color.on-danger', 'color.danger'], ['color.on-danger', 'color.danger-hover'],
  ['color.danger', 'color.surface'], ['color.danger', 'color.error-surface'],
  ['color.success', 'color.success-surface'], ['color.warning', 'color.warning-surface'],
];

export const primitiveVariable = (name: string): string => `--ui-p-${name}`;
export const semanticVariable = (role: string): string => `--ui-${role.replace('.', '-')}`;

/**
 * Tailwind shares text-* between colors/sizes and font-* between families/weights.
 * Type prefixes keep these roles independent, including additional roles.
 * Border widths and motion are referenced directly from semantic CSS variables.
 */
export function tailwindVariable(role: string): string | undefined {
  const [category, name] = role.split('.');
  const namespace: Record<string, string> = {
    color: 'color-color', font: 'font-family', text: 'text-size', leading: 'leading', weight: 'font-weight-weight',
    space: 'spacing', radius: 'radius', size: 'spacing-size',
  };
  return namespace[category] ? `--${namespace[category]}-${name}` : undefined;
}
