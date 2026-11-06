import {uiEnglishMessages} from './locale-en';
import type {UiMessages} from './locale-model';

/** Restore built-in Japanese fallback text, including inside an English locale scope. */
export const uiJapaneseMessages:UiMessages=Object.freeze(Object.fromEntries(Object.keys(uiEnglishMessages).map(source=>[source,source])));
