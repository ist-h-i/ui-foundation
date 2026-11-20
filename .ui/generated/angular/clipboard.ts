import { DOCUMENT, inject, InjectionToken } from '@angular/core';

export type ClipboardWriter = (text: string) => Promise<void>;

/** Applications can supply a writer. The browser clipboard is resolved only on user activation. */
export const UI_CLIPBOARD_WRITER = new InjectionToken<ClipboardWriter>('UI_CLIPBOARD_WRITER', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return async text => {
      const clipboard = document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard API is unavailable.');
      await clipboard.writeText(text);
    };
  },
});
