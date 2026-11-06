# フォーム・locale・RTL・profileの共通契約

[English](ui-library-runtime-foundation-spec.en.md)

既存入力からTree・Scheduler・表・媒体・専門部品まで共通のフォーム・言語・方向・プロファイル契約です。[利用手順](ui-library-consumer-guide.ja.md)、[正確な型・props・methods](ui-library-api.json)を併せて読んでください。

## 公開locale API

`provideUiLocale(options | Signal<UiLocaleOptions>)`は`UI_LOCALE: Signal<UiLocaleResolved>`を提供する。局所`UiLocaleScope`は`[uiLocale]`で親の値を継承する。部品は`injectUiLocale()`と`injectUiText()`、`UiMessagePipe`を読む。純関数`resolveUiLocale/uiMessage`も公開する。`UiText`という公開型はない。

optionsは`locale/direction/timeZone/dateInputFormat/civilDateOptions/dateTimeOptions/numberOptions/messages`。YAMLの`default_language: en`で生成した場合は`en-US`と英語辞書、`ja`または項目のない既存設定は`ja-JP`と日本語fallbackが既定。方向/timezoneは未指定、日付入力は`native`、civil表示は`dateStyle:full`、日時は`dateStyle:medium,timeStyle:short`。明示した部品propを共通値より優先する。不正なIntl設定や辞書shapeを診断し、hostの言語/timezoneへ黙って変更しない。runtime APIからYAML/profileを変更しない。

辞書はライブラリ所有の既定文言をキーにし、未指定は元の文言を表示する。同梱の英語辞書は、生成済みの公開入口から `uiEnglishMessages` を import し、`provideUiLocale` の `messages` に指定して選択する。静的説明・操作・状態・構造診断の表示へ適用し、アプリのラベル・候補名称・本文・backend失敗本文は原文を保つ。純モデルが返す診断は既定の文言を維持し、通常はUIの表示時に翻訳する。FilterBuilderの必須条件が空の場合は、Validatorが返すメッセージにも辞書が適用される。辞書/パラメータはown propertyを読み、Angular text interpolationがHTMLをescapeする。

## 日付・数値・方向

日付入力は`native/yyyy-MM-dd/yyyy/MM/dd/dd/MM/yyyy/MM/dd/yyyy`。civil ISO値をUTCで表示しtimezone変換しない。日時/時間軸/日程はpropまたはproviderの明示timezoneを要求する。Intl表示で元の数値/raw IDを変換しない。NumberInputの明示locale/grouping/fractionDigits、Chart各軸のnumber/date options/category名、Ganttのcivil書式を優先する。

UiLocaleScopeはnative lang/dirと公開CDK Directionalityのvalue/valueSignal/changeへ接続する。アプリの明示Dir・外部属性変更を尊重し、自身が書いた属性だけを追跡する。destroy時は現値が最後の所有値と一致する場合だけ復元し、Observerとchangeを終了する。他scopeのDOMを変更しない。コード・識別子・図の座標rendererの局所LTRと周囲のRTL操作を分ける。

## フォームと未確定draft

native入力/CVAは値・disabled・nullable reset・touched・Validatorを接続する。`updateOn:blur`は部品内の候補/添付への移動で確定せず、全体からの離脱で通知する。profile/locale/readonly/disabled切替で入力DOMとdraftを保つ。vendor editor/非同期ackはzoneless OnPush親値表示へ反映する。CVAだけでFormControl generic型のtemplate完全一致を保証しないため、型付きconsumerとruntime validationを分けて確認する。

DateRangeは各端のraw draftと最後の完全rangeを分ける。一方が不正な間は他方の編集も片側だけpublishせず、双方が有効なとき一括commitする。同値resetで拒否draftを修復する。 日付書式をproviderまたはpropから変更した時、未確定の不正入力がある間はその入力と表示中の書式を保持する。有効な修復入力、明示reset/clear、カレンダー選択で新しい書式へ移る。書式変更だけでValidatorをVALIDへ戻さない。

MessageComposer/ChatのCVAは編集中text。attachments/messagesやbackend保存値ではない。sendRequestedはintentで、current IDの`completeSend/failSend/markSendUnknown`へアプリが応答する。pending/unknownは連打を止め、失敗はdraftを保持。明示writeValue/resetは失敗表示と保留要求を失効し、旧ackは新入力を消さない。

FileUpload/DropzoneのCVAは直近に完全受理した`readonly File[] | null`のbatch。不正shapeやmixed rejectionで親値を保持しValidator/UIで説明する。個別upload intentとCVA一括受理を区別する。同値resetで拒否/native pickerを修復。id/requestIdは同じhost/保持itemsとの衝突を避け、retryは同じid・新requestId。backendのglobal IDはアプリが所有する。

表/Spreadsheet/Gantt等の編集は検証後のintent。構造container/FormActionsに架空の保存CVAを追加しない。通信・認可・保存結果・安全な再試行・実Undoはアプリが所有する。

## プロファイルと確認範囲

YAML正本が全カテゴリの色・書体・文字・余白・寸法・形状を制御する。媒体/図viewportは表と独立したsemantic role。literal semantic参照監査・生成一致・strict AOT・実consumer操作を区別し、全ソースAST逸脱検査とは扱わない。

server DIのglobal参照抑止と、完全なSSR rendering/hydrationは別範囲です。採用するアプリで確認してください。

ライブラリ所有の保持状態文言は `uiMessageState` の表示境界で現在の辞書を読む。条件分岐・件数・アプリ由来の値は操作時に確定し、辞書変更でWorker/取得/保存を再実行しない。明示 `set(appText)` は辞書keyと一致しても原文を保持する。`setMessage(parts)` はライブラリ文言だけを遅延評価し、動的な非翻訳部分は操作時の文字列を保持する。FileUpload拒否本文、Schedulerのprivate移動状態、Diffのvendor説明とJson表示診断も表示境界へ接続する。JSONの原文・技術的な型名/parse code/offset・純モデル診断は保持する。
