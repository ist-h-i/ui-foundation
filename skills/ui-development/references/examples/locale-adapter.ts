import { computed, signal } from '@angular/core';
import type { UiLocaleOptions, UiMessageRequest } from './.ui/generated/angular';

type Language = 'en-US' | 'ja-JP' | 'ar';
type Dictionary = Readonly<Record<string, unknown>>;

/** App-owned locale state and a lazy dictionary cache. */
export function createLocaleAdapter() {
  const language = signal<Language>('en-US');
  const dictionaries = signal<Partial<Record<Language, Dictionary>>>({});
  const loading = new Map<Language, Promise<void>>();
  const options = computed<UiLocaleOptions>(() => ({
    locale: language(),
    direction: language() === 'ar' ? 'rtl' : 'ltr',
    translate(request: UiMessageRequest, locale: string) {
      // Use exactly the requested locale, including when inherited by a scope.
      if (locale !== 'en-US' && locale !== 'ja-JP' && locale !== 'ar') return undefined;
      const dictionary = dictionaries()[locale];
      if (!dictionary || !Object.hasOwn(dictionary, request.id)) return undefined;
      const message = dictionary[request.id];
      if (typeof message !== 'string') return undefined;
      const parameters: Readonly<Record<string, string | number | null>> | undefined =
        'parameters' in request ? request.parameters : undefined;
      let missingParameter = false;
      const translated = message.replace(/\{([A-Za-z]\w*)\}/g, (_, name: string) => {
        if (parameters && Object.hasOwn(parameters, name)) return String(parameters[name] ?? '');
        missingParameter = true;
        return '';
      });
      return missingParameter ? undefined : translated;
    },
  }));

  async function switchLanguage(next: Language): Promise<void> {
    language.set(next);
    if (dictionaries()[next]) return;
    const current = loading.get(next);
    if (current) return current;
    const request = fetch(`/translations/${next}.json`)
      .then(async response => {
        if (!response.ok) return;
        const dictionary: unknown = await response.json();
        if (dictionary && typeof dictionary === 'object' && !Array.isArray(dictionary)) {
          dictionaries.update(previous => ({ ...previous, [next]: dictionary as Dictionary }));
        }
      })
      .catch(() => {
        // The built-in text stays visible; switching to this locale again can retry.
      })
      .finally(() => loading.delete(next));
    loading.set(next, request);
    return request;
  }

  return { options, switchLanguage };
}
