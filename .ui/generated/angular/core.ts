// Public entry for actions, cards and native form fields.
export { ActionControl, ActionLink, type ActionVariant, type ActionSize } from './action-control';
export { Card, CardHeader, CardBody, CardFooter, CardMedia, CardActions, CardTemplate, type CardArea, type CardContext } from './card';
export { FormField, FieldControl } from './form-field';
export { Icon, provideUiIcons } from './icon';
export { UI_LOCALE, UiLocaleScope, UiMessagePipe, provideUiLocale, injectUiLocale, injectUiText } from './locale';
export { defaultUiLocale, resolveUiLocale, uiMessage } from './locale-model';
export { uiEnglishMessages } from './locale-en';
export { uiJapaneseMessages } from './locale-ja';
export type { UiDirection, UiMessages, UiLocaleOptions, UiLocaleResolved } from './locale-model';
export type { UiMessageId, UiMessageParameters, UiMessageRequest, UiMessageTranslator } from './stable-messages';
