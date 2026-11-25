import type { UiMessageRequest, UiMessageTranslator, UiPatternMessageId } from './stable-messages';

export function translateUiMessage(
  request: UiMessageRequest, locale: string, translate: UiMessageTranslator | null | undefined,
): string | undefined {
  const message = translate?.(request, locale);
  return message?.trim() && message.trim() !== request.id ? message : undefined;
}

export function usesJapaneseMessages(locale: string): boolean {
  return /^ja(?:-|$)/i.test(locale);
}

export interface UiMessagePattern {
  readonly ja: string;
  readonly en: string;
  readonly one?: string;
}

export function formatUiMessagePattern(message: UiMessagePattern, request: UiMessageRequest<UiPatternMessageId>, locale: string): string {
  const parameters: Readonly<Record<string, string | number>> = 'parameters' in request ? request.parameters : {};
  const copy = usesJapaneseMessages(locale) ? message.ja : message.one && parameters['count'] === 1 ? message.one : message.en;
  return copy.replace(/\{(\w+)\}/g, (placeholder: string, name: string) => {
    if (!Object.hasOwn(parameters, name)) return placeholder;
    const value = parameters[name];
    return typeof value === 'number' ? new Intl.NumberFormat(locale, { maximumSignificantDigits: 17 }).format(value) : value;
  });
}
