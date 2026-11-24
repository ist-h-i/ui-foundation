import { ApplicationRef, inject, InjectionToken, Injector, type Provider } from '@angular/core';
import { LUCIDE_CONFIG, LUCIDE_ICONS } from '@lucide/angular';
import { provideUiIcons as provideDefaults } from './defaults';
import { UI_ICON_LUCIDE, UI_ICON_REGISTRY, type UiIconInput, type UiIconLucideAdapter, type UiIconRegistry } from './registry';

// This scope explicitly linked both public registries, so even an empty later native provider wins.
const SHARED_REGISTRATION = new InjectionToken<boolean>('UI shared Lucide registration');

function readClosestIcons(): UiIconRegistry {
  // Resolve both tokens normally first, so projected views retain Angular's visibility rules.
  const native = inject(LUCIDE_ICONS);
  const selected = inject(UI_ICON_REGISTRY);
  if (selected === native) return native;
  // The public tokens can be provided independently. The closest registration wins, and
  // at a shared level Lucide's token reflects the order of native and bridged providers.
  let scope: Injector | null = inject(Injector);
  while (scope) {
    const hasNative = scope.get(LUCIDE_ICONS, null, { self: true }) === native;
    const hasSelected = scope.get(UI_ICON_REGISTRY, null, { self: true }) === selected;
    if (hasNative) {
      // Lucide supplies an empty root registry even when the app only configures its paint.
      if (hasSelected && Object.keys(native).length === 0
        && !scope.get(SHARED_REGISTRATION, false, { self: true })
        && scope.get(ApplicationRef, null, { self: true })?.injector === scope) return selected;
      return native;
    }
    if (hasSelected) return selected;
    scope = scope.get(Injector, null, { skipSelf: true });
  }
  return native;
}

const adapter: UiIconLucideAdapter = {
  readIcons: readClosestIcons,
  readConfig: () => inject(LUCIDE_CONFIG),
};

/** Read registrations and settings from the Lucide injector closest to the icon. */
export function provideUiLucideInterop(): Provider {
  return { provide: UI_ICON_LUCIDE, useValue: adapter };
}

/** Share the defaults and additions with both ui-icon and svg[lucideIcon]. */
export function provideUiIcons(...icons: UiIconInput[]): Provider {
  return [
    provideDefaults(...icons),
    { provide: SHARED_REGISTRATION, useValue: true },
    { provide: LUCIDE_ICONS, useExisting: UI_ICON_REGISTRY },
    provideUiLucideInterop(),
  ];
}
