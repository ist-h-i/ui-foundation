/** Stable, library-owned message IDs and their named parameters. */
export interface UiMessageParameters {
  'uiFoundation.pageFrame.sidebarLabel': undefined;
  'uiFoundation.collection.selectionLimit': { readonly limit: number };
}

export type UiMessageId = keyof UiMessageParameters;
export type UiMessageRequest = {
  [Id in UiMessageId]: UiMessageParameters[Id] extends undefined
    ? { readonly id: Id }
    : { readonly id: Id; readonly parameters: UiMessageParameters[Id] }
}[UiMessageId];

export type UiMessageTranslator = (request: UiMessageRequest, locale: string) => string | undefined;

type Dictionary = {
  [Id in UiMessageId]: (message: Extract<UiMessageRequest, { id: Id }>, locale: string) => string;
};

const japanese: Dictionary = {
  'uiFoundation.pageFrame.sidebarLabel': () => 'サイドバー',
  'uiFoundation.collection.selectionLimit': ({ parameters }, locale) =>
    `${new Intl.NumberFormat(locale).format(parameters.limit)}件まで選択してください。`,
};

const english: Dictionary = {
  'uiFoundation.pageFrame.sidebarLabel': () => 'Sidebar',
  'uiFoundation.collection.selectionLimit': ({ parameters }, locale) => {
    const { limit } = parameters;
    if (limit === 0) return 'Selection is unavailable.';
    const unit = new Intl.PluralRules(locale).select(limit) === 'one' ? 'item' : 'items';
    return `Select up to ${new Intl.NumberFormat(locale).format(limit)} ${unit}.`;
  },
};

/** An external provider can return undefined while loading or for an absent translation. */
export function resolveUiMessage(request: UiMessageRequest, locale: string, translate?: UiMessageTranslator | null): string {
  const translated = translate?.(request, locale);
  if (translated?.trim()) return translated;

  const dictionary = new Intl.Locale(locale).language === 'ja' ? japanese : english;
  switch (request.id) {
    case 'uiFoundation.pageFrame.sidebarLabel':
      return dictionary[request.id](request, locale);
    case 'uiFoundation.collection.selectionLimit':
      return dictionary[request.id](request, locale);
  }
}
