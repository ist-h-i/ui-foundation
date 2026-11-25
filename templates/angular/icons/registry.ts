import { InjectionToken, type Provider } from '@angular/core';

export type UiIconAttributes = Readonly<Record<string, unknown>>;
export type UiIconNode = readonly [name: string, attributes: UiIconAttributes, children?: readonly UiIconNode[]];

export interface UiIconData {
  readonly name: string;
  readonly node: readonly UiIconNode[];
  readonly aliases?: readonly string[];
  readonly size?: number;
  readonly width?: number;
  readonly height?: number;
}

/** Angular Lucide components expose their icon data on a public static property. */
export type UiIconInput = UiIconData | { readonly icon: UiIconData };
export type UiIconRegistry = Readonly<Record<string, UiIconData>>;

export interface UiIconConfig {
  readonly color: string;
  readonly size: string | number;
  readonly strokeWidth: number;
  readonly absoluteStrokeWidth: boolean;
  readonly nonScalingStroke: boolean;
}

export interface UiIconLucideAdapter {
  readIcons(): UiIconRegistry;
  readConfig(): UiIconConfig;
}

export const UI_ICON_REGISTRY = new InjectionToken<UiIconRegistry>('UI icon registry', {
  factory: () => Object.create(null),
});
export const UI_ICON_LUCIDE = new InjectionToken<UiIconLucideAdapter>('UI icon Lucide integration');
export const UI_ICON_FALLBACKS = new InjectionToken<UiIconRegistry>('UI component fallback icons');

function buildRegistry(icons: readonly UiIconInput[]): UiIconRegistry {
  const entries: Record<string, UiIconData> = Object.create(null);
  for (const icon of icons) {
    const data = 'node' in icon ? icon : icon.icon;
    entries[data.name] = data;
    for (const alias of data.aliases ?? []) entries[alias] = data;
  }
  return entries;
}

/** Register exactly these names and aliases in the current injector. Last registration wins. */
export function selected(...icons: UiIconInput[]): Provider {
  return { provide: UI_ICON_REGISTRY, useValue: buildRegistry(icons) };
}

/** Private to a generated component's own view. The application's registry takes precedence. */
export function fallbackIcons(...icons: UiIconData[]): Provider {
  return { provide: UI_ICON_FALLBACKS, useValue: buildRegistry(icons) };
}
