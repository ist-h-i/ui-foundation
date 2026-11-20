/** Stable, library-owned message IDs and their named parameters. */
export type UiMessageParameters = {
  'uiFoundation.alert.closeLabel': undefined;
  'uiFoundation.resultState.detailsLabel': undefined;
  'uiFoundation.progressBar.indeterminate': undefined;
  'uiFoundation.progressBar.description': { readonly value: number; readonly total: number; readonly percent: number };
  'uiFoundation.notificationCenter.statusFilter': undefined;
  'uiFoundation.notificationCenter.categoryFilter': undefined;
  'uiFoundation.notificationCenter.allStatuses': undefined;
  'uiFoundation.notificationCenter.allCategories': undefined;
  'uiFoundation.notificationCenter.unread': undefined;
  'uiFoundation.notificationCenter.read': undefined;
  'uiFoundation.notificationCenter.markUnread': undefined;
  'uiFoundation.notificationCenter.markRead': undefined;
  'uiFoundation.notificationCenter.delete': undefined;
  'uiFoundation.notificationCenter.empty': undefined;
  'uiFoundation.notificationCenter.loadMore': undefined;
  'uiFoundation.notificationCenter.loading': undefined;
  'uiFoundation.notificationCenter.retry': undefined;
  'uiFoundation.snackbar.dismiss': undefined;
  'uiFoundation.notificationCenter.markUnreadLabel': { readonly title: string };
  'uiFoundation.notificationCenter.markReadLabel': { readonly title: string };
  'uiFoundation.notificationCenter.deleteLabel': { readonly title: string };
  'uiFoundation.snackbar.dismissLabel': { readonly message: string };
  'uiFoundation.notificationCenter.status': { readonly visible: number; readonly unread: number; readonly loading: string | null };
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
  'uiFoundation.listbox.clearVisible': undefined;
  'uiFoundation.listbox.invalidControlIdentity': undefined;
  'uiFoundation.listbox.invalidOptions': undefined;
  'uiFoundation.listbox.invalidSearchLocale': undefined;
  'uiFoundation.listbox.invalidSelection': undefined;
  'uiFoundation.listbox.invalidSelectionLimit': undefined;
  'uiFoundation.listbox.invalidVirtualConfiguration': undefined;
  'uiFoundation.listbox.multipleValueRequired': undefined;
  'uiFoundation.listbox.noOptions': undefined;
  'uiFoundation.listbox.noSearchResults': undefined;
  'uiFoundation.listbox.searchLabel': undefined;
  'uiFoundation.listbox.selectVisible': undefined;
  'uiFoundation.listbox.selectionRequired': undefined;
  'uiFoundation.listbox.singleValueRequired': undefined;
  'uiFoundation.listbox.selectedCount': { readonly count: number };
  'uiFoundation.listbox.selectedCountWithInvalidSelection': { readonly count: number };
  'uiFoundation.pageFrame.sidebarLabel': undefined;
  'uiFoundation.segmentedControl.requiredLegend': { readonly label: string };
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

function progressDescription({ parameters }: UiMessageRequest<'uiFoundation.progressBar.description'>, locale: string): string {
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 12 });
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  return `${numbers.format(parameters.value)} / ${numbers.format(parameters.total)} (${percent.format(parameters.percent / 100)})`;
}

const japanese: Dictionary = {
  'uiFoundation.alert.closeLabel': () => '通知を閉じる',
  'uiFoundation.resultState.detailsLabel': () => '結果の詳細',
  'uiFoundation.progressBar.indeterminate': () => '進捗を確認しています。',
  'uiFoundation.progressBar.description': progressDescription,
  'uiFoundation.notificationCenter.statusFilter': () => "通知の状態",
  'uiFoundation.notificationCenter.categoryFilter': () => "通知の分類",
  'uiFoundation.notificationCenter.allStatuses': () => "すべて",
  'uiFoundation.notificationCenter.allCategories': () => "すべて",
  'uiFoundation.notificationCenter.unread': () => "未読",
  'uiFoundation.notificationCenter.read': () => "既読",
  'uiFoundation.notificationCenter.markUnread': () => "未読に戻す",
  'uiFoundation.notificationCenter.markRead': () => "既読にする",
  'uiFoundation.notificationCenter.delete': () => "削除",
  'uiFoundation.notificationCenter.empty': () => "条件に合う通知はありません。",
  'uiFoundation.notificationCenter.loadMore': () => "通知を追加取得",
  'uiFoundation.notificationCenter.loading': () => "通知を取得しています。",
  'uiFoundation.notificationCenter.retry': () => "通知の取得を再試行",
  'uiFoundation.snackbar.dismiss': () => "閉じる",
  'uiFoundation.notificationCenter.markUnreadLabel': ({ parameters }) => `未読に戻す: ${parameters.title}`,
  'uiFoundation.notificationCenter.markReadLabel': ({ parameters }) => `既読にする: ${parameters.title}`,
  'uiFoundation.notificationCenter.deleteLabel': ({ parameters }) => `削除: ${parameters.title}`,
  'uiFoundation.snackbar.dismissLabel': ({ parameters }) => `通知を閉じる: ${parameters.message}`,
  'uiFoundation.notificationCenter.status': ({ parameters }, locale) => {
    const numbers = new Intl.NumberFormat(locale);
    const { visible, unread, loading } = parameters;
    return loading
      ? `${numbers.format(visible)}件表示、未読 ${numbers.format(unread)}件、${loading}`
      : `${numbers.format(visible)}件表示、未読 ${numbers.format(unread)}件`;
  },
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
  'uiFoundation.listbox.clearVisible': () => "表示中の選択を解除",
  'uiFoundation.listbox.invalidControlIdentity': () => "選択欄の識別子と説明を指定してください。",
  'uiFoundation.listbox.invalidOptions': () => "選択肢の値と説明・グループを確認してください。",
  'uiFoundation.listbox.invalidSearchLocale': () => "候補検索の言語を確認してください。",
  'uiFoundation.listbox.invalidSelection': () => "現在の選択と選択肢を確認してください。",
  'uiFoundation.listbox.invalidSelectionLimit': () => "選択上限には正の整数を指定してください。",
  'uiFoundation.listbox.invalidVirtualConfiguration': () => "候補の高さと先読み件数を確認してください。",
  'uiFoundation.listbox.multipleValueRequired': () => "複数選択には値の配列を指定してください。",
  'uiFoundation.listbox.noOptions': () => "選択肢はありません。",
  'uiFoundation.listbox.noSearchResults': () => "条件に一致する候補はありません。",
  'uiFoundation.listbox.searchLabel': () => "候補を検索",
  'uiFoundation.listbox.selectVisible': () => "表示中をすべて選択",
  'uiFoundation.listbox.selectionRequired': () => "選択してください。",
  'uiFoundation.listbox.singleValueRequired': () => "単一選択には一つの値を指定してください。",
  'uiFoundation.listbox.selectedCount': ({ parameters }, locale) =>
    `${new Intl.NumberFormat(locale).format(parameters.count)}件選択`,
  'uiFoundation.listbox.selectedCountWithInvalidSelection': ({ parameters }, locale) =>
    `${new Intl.NumberFormat(locale).format(parameters.count)}件選択 · 選択上限または現在の値を確認してください。`,
  'uiFoundation.pageFrame.sidebarLabel': () => "サイドバー",
  'uiFoundation.segmentedControl.requiredLegend': ({ parameters }) => `${parameters.label} (必須)`,
  'uiFoundation.splitButton.menuLabel': () => "その他の操作",
  'uiFoundation.card.collapse': ({ parameters }) => `折り畳む: ${parameters.title}`,
  'uiFoundation.card.expand': ({ parameters }) => `展開: ${parameters.title}`,
  'uiFoundation.collection.selectionLimit': ({ parameters }, locale) =>
    `${new Intl.NumberFormat(locale).format(parameters.limit)}件まで選択してください。`,
};

const english: Dictionary = {
  'uiFoundation.alert.closeLabel': () => 'Close alert',
  'uiFoundation.resultState.detailsLabel': () => 'Result details',
  'uiFoundation.progressBar.indeterminate': () => 'Checking progress.',
  'uiFoundation.progressBar.description': progressDescription,
  'uiFoundation.notificationCenter.statusFilter': () => "Notification status",
  'uiFoundation.notificationCenter.categoryFilter': () => "Notification category",
  'uiFoundation.notificationCenter.allStatuses': () => "All",
  'uiFoundation.notificationCenter.allCategories': () => "All",
  'uiFoundation.notificationCenter.unread': () => "Unread",
  'uiFoundation.notificationCenter.read': () => "Read",
  'uiFoundation.notificationCenter.markUnread': () => "Mark unread",
  'uiFoundation.notificationCenter.markRead': () => "Mark read",
  'uiFoundation.notificationCenter.delete': () => "Delete",
  'uiFoundation.notificationCenter.empty': () => "No notifications match these filters.",
  'uiFoundation.notificationCenter.loadMore': () => "Load more notifications",
  'uiFoundation.notificationCenter.loading': () => "Loading notifications…",
  'uiFoundation.notificationCenter.retry': () => "Retry loading notifications",
  'uiFoundation.snackbar.dismiss': () => "Close",
  'uiFoundation.notificationCenter.markUnreadLabel': ({ parameters }) => `Mark unread: ${parameters.title}`,
  'uiFoundation.notificationCenter.markReadLabel': ({ parameters }) => `Mark read: ${parameters.title}`,
  'uiFoundation.notificationCenter.deleteLabel': ({ parameters }) => `Delete: ${parameters.title}`,
  'uiFoundation.snackbar.dismissLabel': ({ parameters }) => `Close notification: ${parameters.message}`,
  'uiFoundation.notificationCenter.status': ({ parameters }, locale) => {
    const numbers = new Intl.NumberFormat(locale);
    const plurals = new Intl.PluralRules(locale);
    const { visible, unread, loading } = parameters;
    const noun = plurals.select(visible) === 'one' ? 'notification' : 'notifications';
    return loading
      ? `${numbers.format(visible)} ${noun} shown. ${numbers.format(unread)} unread. ${loading}`
      : `${numbers.format(visible)} ${noun} shown. ${numbers.format(unread)} unread.`;
  },
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
  'uiFoundation.listbox.clearVisible': () => "Clear visible selections",
  'uiFoundation.listbox.invalidControlIdentity': () => "Provide an ID and a description for the selection field.",
  'uiFoundation.listbox.invalidOptions': () => "Check the option values, descriptions, and groups.",
  'uiFoundation.listbox.invalidSearchLocale': () => "Check the language used to search options.",
  'uiFoundation.listbox.invalidSelection': () => "Check the current selection and options.",
  'uiFoundation.listbox.invalidSelectionLimit': () => "Use a positive integer for the selection limit.",
  'uiFoundation.listbox.invalidVirtualConfiguration': () => "Check the option height and overscan count.",
  'uiFoundation.listbox.multipleValueRequired': () => "Provide an array of values for multiple selection.",
  'uiFoundation.listbox.noOptions': () => "There are no options.",
  'uiFoundation.listbox.noSearchResults': () => "No matching options.",
  'uiFoundation.listbox.searchLabel': () => "Search options",
  'uiFoundation.listbox.selectVisible': () => "Select all shown",
  'uiFoundation.listbox.selectionRequired': () => "Choose an option.",
  'uiFoundation.listbox.singleValueRequired': () => "Provide a single value for single selection.",
  'uiFoundation.listbox.selectedCount': ({ parameters }, locale) =>
    `${new Intl.NumberFormat(locale).format(parameters.count)} selected`,
  'uiFoundation.listbox.selectedCountWithInvalidSelection': ({ parameters }, locale) =>
    `${new Intl.NumberFormat(locale).format(parameters.count)} selected · Check the selection limit or the current value.`,
  'uiFoundation.pageFrame.sidebarLabel': () => "Sidebar",
  'uiFoundation.segmentedControl.requiredLegend': ({ parameters }) => `${parameters.label} (required)`,
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
  // Some adapters return the lookup key when their dictionary is unavailable.
  if (translated?.trim() && translated.trim() !== request.id) return translated;

  const dictionary = /^ja(?:-|$)/i.test(locale) ? japanese : english;
  return dictionary[request.id](request, locale);
}
