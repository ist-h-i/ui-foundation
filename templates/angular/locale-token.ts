import { computed, inject, InjectionToken, isSignal, type Provider, type Signal } from '@angular/core';
import { defaultUiLocale, resolveUiLocale, type UiLocaleOptions, type UiLocaleResolved } from './locale-model';

export const UI_LOCALE=new InjectionToken<Signal<UiLocaleResolved>>('UI_LOCALE',{providedIn:'root',factory:()=>computed(()=>defaultUiLocale)});
/** The app owns the source signal. Updating it preserves existing controls/overlays. */
export function provideUiLocale(options:UiLocaleOptions|Signal<UiLocaleOptions>):Provider[]{
 return [{provide:UI_LOCALE,useFactory:()=>computed(()=>resolveUiLocale(isSignal(options)?options():options))}];
}
export function injectUiLocale():Signal<UiLocaleResolved>{return inject(UI_LOCALE);}
