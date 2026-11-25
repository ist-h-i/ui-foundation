import { injectUiLocale } from './locale-token';
import { formatUiMessagePattern, translateUiMessage, type UiMessagePattern } from './message-format';
import type { UiMessageRequest, UiPatternMessageId } from './stable-messages';

/** Bind each component to the defaults it owns and read the active locale on every render. */
export function injectComponentMessageText<Id extends UiPatternMessageId>(
  catalog: Readonly<Record<Id, UiMessagePattern>>,
): (request: UiMessageRequest<Id>) => string;
export function injectComponentMessageText(catalog: Readonly<Record<string, UiMessagePattern>>) {
  const uiLocale = injectUiLocale();
  return (request: UiMessageRequest<UiPatternMessageId>): string => {
    const { locale, translate } = uiLocale();
    return translateUiMessage(request, locale, translate) ?? formatUiMessagePattern(catalog[request.id], request, locale);
  };
}
