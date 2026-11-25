/** Icons registered by the generated provideUiIcons() in their override order. */
export const defaultIconNames = [
  'circle-check', 'circle-alert', 'info', 'search', 'x', 'chevron-right',
  'chevron-down', 'copy', 'calendar', 'menu', 'plus', 'loader-circle',
] as const;

/** Folder is available to register on a lazy route independently of the defaults. */
export const iconDataNames = [...defaultIconNames, 'folder'] as const;
export const lucideInteropEntry = 'icons/lucide.ts';
