/** Stable, library-owned message IDs and their named parameters. */
export type UiMessageParameters = {
  'uiFoundation.actionButton.busy': undefined;
  'uiFoundation.actionControl.busy': undefined;
  'uiFoundation.actionFeedback.busy': undefined;
  'uiFoundation.actionLink.external': undefined;
  'uiFoundation.asyncRegion.retryAction': undefined;
  'uiFoundation.bottomSheet.decreaseHeight': undefined;
  'uiFoundation.bottomSheet.heightLabel': undefined;
  'uiFoundation.bottomSheet.increaseHeight': undefined;
  'uiFoundation.card.loading': undefined;
  'uiFoundation.copyButton.action': undefined;
  'uiFoundation.copyButton.failure': undefined;
  'uiFoundation.copyButton.success': undefined;
  'uiFoundation.dialog.busy': undefined;
  'uiFoundation.dialog.closeAction': undefined;
  'uiFoundation.dialog.closeLabel': undefined;
  'uiFoundation.dialog.maximize': undefined;
  'uiFoundation.dialog.moveAction': undefined;
  'uiFoundation.dialog.moveInstructions': undefined;
  'uiFoundation.dialog.moveLabel': undefined;
  'uiFoundation.dialog.resizeAction': undefined;
  'uiFoundation.dialog.resizeInstructions': undefined;
  'uiFoundation.dialog.resizeLabel': undefined;
  'uiFoundation.dialog.restoreSize': undefined;
  'uiFoundation.floatingActionButton.menuLabel': undefined;
  'uiFoundation.pageFrame.sidebarLabel': undefined;
  'uiFoundation.segmentedControl.requiredMarker': undefined;
  'uiFoundation.splitButton.menuLabel': undefined;
  'uiFoundation.card.collapse': { readonly title: string };
  'uiFoundation.card.expand': { readonly title: string };
  'uiFoundation.collection.selectionLimit': { readonly limit: number };
};

export type UiMessageId = keyof UiMessageParameters;
export type UiStaticMessageId = {
  [Id in UiMessageId]: UiMessageParameters[Id] extends undefined ? Id : never;
}[UiMessageId];

type Requests = {
  [Id in UiMessageId]: UiMessageParameters[Id] extends undefined
    ? { readonly id: Id }
    : { readonly id: Id; readonly parameters: UiMessageParameters[Id] }
};

export type UiMessageRequest<Id extends UiMessageId = UiMessageId> = Requests[Id];

export type UiMessageTranslator = (request: UiMessageRequest, locale: string) => string | undefined;

type Dictionary = {
  [Id in UiMessageId]: (message: UiMessageRequest<Id>, locale: string) => string;
};

const japanese: Dictionary = {
  'uiFoundation.actionButton.busy': () => "処理中",
  'uiFoundation.actionControl.busy': () => "処理中",
  'uiFoundation.actionFeedback.busy': () => "処理しています。",
  'uiFoundation.actionLink.external': () => "外部リンク",
  'uiFoundation.asyncRegion.retryAction': () => "再試行",
  'uiFoundation.bottomSheet.decreaseHeight': () => "低くする",
  'uiFoundation.bottomSheet.heightLabel': () => "表示領域の高さ",
  'uiFoundation.bottomSheet.increaseHeight': () => "高くする",
  'uiFoundation.card.loading': () => "内容を読み込んでいます。",
  'uiFoundation.copyButton.action': () => "コピー",
  'uiFoundation.copyButton.failure': () => "コピーできませんでした。再試行してください。",
  'uiFoundation.copyButton.success': () => "コピーしました。",
  'uiFoundation.dialog.busy': () => "処理しています。",
  'uiFoundation.dialog.closeAction': () => "閉じる",
  'uiFoundation.dialog.closeLabel': () => "ダイアログを閉じる",
  'uiFoundation.dialog.maximize': () => "最大化",
  'uiFoundation.dialog.moveAction': () => "移動",
  'uiFoundation.dialog.moveInstructions': () => "矢印キーで移動、Shiftで大きく移動",
  'uiFoundation.dialog.moveLabel': () => "ダイアログを移動",
  'uiFoundation.dialog.resizeAction': () => "サイズ変更",
  'uiFoundation.dialog.resizeInstructions': () => "矢印キーで幅と高さを変更、Shiftで大きく変更",
  'uiFoundation.dialog.resizeLabel': () => "ダイアログのサイズを変更",
  'uiFoundation.dialog.restoreSize': () => "元の大きさに戻す",
  'uiFoundation.floatingActionButton.menuLabel': () => "補助操作",
  'uiFoundation.pageFrame.sidebarLabel': () => "サイドバー",
  'uiFoundation.segmentedControl.requiredMarker': () => " (必須)",
  'uiFoundation.splitButton.menuLabel': () => "その他の操作",
  'uiFoundation.card.collapse': ({ parameters }) => `折り畳む: ${parameters.title}`,
  'uiFoundation.card.expand': ({ parameters }) => `展開: ${parameters.title}`,
  'uiFoundation.collection.selectionLimit': ({ parameters }, locale) =>
    `${new Intl.NumberFormat(locale).format(parameters.limit)}件まで選択してください。`,
};

const english: Dictionary = {
  'uiFoundation.actionButton.busy': () => "Working",
  'uiFoundation.actionControl.busy': () => "Working",
  'uiFoundation.actionFeedback.busy': () => "Working…",
  'uiFoundation.actionLink.external': () => "External link",
  'uiFoundation.asyncRegion.retryAction': () => "Retry",
  'uiFoundation.bottomSheet.decreaseHeight': () => "Decrease height",
  'uiFoundation.bottomSheet.heightLabel': () => "Viewport height",
  'uiFoundation.bottomSheet.increaseHeight': () => "Increase height",
  'uiFoundation.card.loading': () => "Loading content…",
  'uiFoundation.copyButton.action': () => "Copy",
  'uiFoundation.copyButton.failure': () => "Unable to copy. Try again.",
  'uiFoundation.copyButton.success': () => "Copied.",
  'uiFoundation.dialog.busy': () => "Working…",
  'uiFoundation.dialog.closeAction': () => "Close",
  'uiFoundation.dialog.closeLabel': () => "Close dialog",
  'uiFoundation.dialog.maximize': () => "Maximize",
  'uiFoundation.dialog.moveAction': () => "Move",
  'uiFoundation.dialog.moveInstructions': () => "Use the Arrow keys to move. Hold Shift to move farther.",
  'uiFoundation.dialog.moveLabel': () => "Move dialog",
  'uiFoundation.dialog.resizeAction': () => "Resize",
  'uiFoundation.dialog.resizeInstructions': () => "Use the Arrow keys to resize. Hold Shift for larger increments.",
  'uiFoundation.dialog.resizeLabel': () => "Resize dialog",
  'uiFoundation.dialog.restoreSize': () => "Restore original size",
  'uiFoundation.floatingActionButton.menuLabel': () => "More actions",
  'uiFoundation.pageFrame.sidebarLabel': () => "Sidebar",
  'uiFoundation.segmentedControl.requiredMarker': () => " (required)",
  'uiFoundation.splitButton.menuLabel': () => "More actions",
  'uiFoundation.card.collapse': ({ parameters }) => `Collapse: ${parameters.title}`,
  'uiFoundation.card.expand': ({ parameters }) => `Expand: ${parameters.title}`,
  'uiFoundation.collection.selectionLimit': ({ parameters }, locale) => {
    const { limit } = parameters;
    if (limit === 0) return 'Selection is unavailable.';
    const unit = limit === 1 ? 'item' : 'items';
    return `Select up to ${new Intl.NumberFormat(locale).format(limit)} ${unit}.`;
  },
};

/** An external provider can return undefined while loading or for an absent translation. */
export function resolveUiMessage<Id extends UiMessageId>(request: UiMessageRequest<Id> & UiMessageRequest, locale: string, translate?: UiMessageTranslator | null): string {
  const translated = translate?.(request, locale);
  if (translated?.trim()) return translated;

  const dictionary = /^ja(?:-|$)/i.test(locale) ? japanese : english;
  return dictionary[request.id](request, locale);
}
