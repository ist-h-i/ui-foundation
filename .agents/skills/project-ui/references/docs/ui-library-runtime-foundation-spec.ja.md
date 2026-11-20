# フォーム・locale・RTL・profileの共通契約

[English](ui-library-runtime-foundation-spec.en.md)

既存入力からTree・Scheduler・表・媒体・専門部品まで共通のフォーム・言語・方向・プロファイル契約です。[利用手順](ui-library-consumer-guide.ja.md)、[正確な型・props・methods](ui-library-api.json)を併せて読んでください。

## 公開locale API

`provideUiLocale(options | Signal<UiLocaleOptions>)` は `UI_LOCALE: Signal<UiLocaleResolved>` を提供する。`UiLocaleScope` は `[uiLocale]` で親の値を継承する。設定の参照は `injectUiLocale()`、引数付きの文言は `injectUiMessage()` に `UiMessageRequest` を渡して表示する。テンプレートでは、IDと名前付き引数を `UiStableMessagePipe` に渡せる。`resolveUiLocale` と `resolveUiMessage` は公開の純関数。

設定項目は `locale/direction/timeZone/dateInputFormat/civilDateOptions/dateTimeOptions/numberOptions/translate`。YAMLの `default_language: en` は `en-US`、`ja` と項目のない既存設定は `ja-JP` が既定。方向とタイムゾーンは未指定、日付入力は `native`、暦日は `dateStyle:full`、日時は `dateStyle:medium,timeStyle:short`。明示した部品の入力設定を優先する。不正なIntl設定や翻訳関数の型は診断する。実行時の設定はYAMLやプロファイルを変更しない。

`translate(request, locale)` には、部品が持つ操作・状態・構造上の診断などの安定IDと名前付き引数を渡す。辞書の読み込み中は `undefined` を返せる。未取得、空欄、IDそのままの戻り値は、日本語ロケールなら標準の日本語、それ以外では標準の英語で表示する。子領域は親の翻訳関数を継承し、独自の関数や `translate: null@ を設定できる。アプリのラベル・候補名・本文・APIエラーはアプリが翻訳する。Angularのテキスト補間はHTMLをエスケープする。[利用ガイドと接続例](ui-library-consumer-guide.ja.md#locale文言rtl-の責任)

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
