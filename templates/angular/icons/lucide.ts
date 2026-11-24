import { inject, type Provider } from '@angular/core';
import { LUCIDE_CONFIG, LUCIDE_ICONS } from '@lucide/angular';
import { provideUiIcons as provideDefaults } from './defaults';
import { UI_ICON_LUCIDE, UI_ICON_REGISTRY, type UiIconInput, type UiIconLucideAdapter } from './registry';

const adapter: UiIconLucideAdapter = {
  readIcons: () => inject(LUCIDE_ICONS),
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
    { provide: LUCIDE_ICONS, useExisting: UI_ICON_REGISTRY },
    provideUiLucideInterop(),
  ];
}
