# 共通UIの利用契約

生成部品を使う画面では、利用者の目的に必要な部品だけを構成する。カタログ全体を一画面へ配置しない。共通基盤の正本はYAMLのセマンティックとプロファイルで、runtime localeや業務状態から機械設定を推測しない。

## フォーム・言語・方向

`provideUiLocale(options | Signal<UiLocaleOptions>)`と局所`UiLocaleScope`の`[uiLocale]`は、言語、入力日付書式、Intlの表示オプション、明示タイムゾーン、方向、構造文言辞書を共有する。個別部品の明示propを優先する。`UI_LOCALE`、`injectUiLocale()`、`injectUiText()`、`UiMessagePipe`、`uiMessage`が公開API。辞書はライブラリの既定文言をキーにし、未指定キーは既定表示を残す。アプリのラベル・本文・backendエラーを勝手に翻訳しない。

date入力はcivil ISO値、数値は数値、選択はraw keyを保つ。DateRangeは両端のraw draftを保ち、片側が不正な間は完全rangeをpublishしない。provider/readonly/disabled/profile切替で入力DOMや未確定draftを作り直さない。nullable reset、`updateOn:'blur'`、zoneless OnPushの値表示を実consumerで検証する。CVAというだけでAngularのFormControlのgeneric型が全templateで一致する保証はない。

UiLocaleScopeはnative lang/dirと公開CDK Directionalityを接続する。アプリの明示Dirと外部属性変更を尊重し、自身が所有する属性だけを破棄時に復元する。Chartの物理的な座標rendererやコード・識別子は局所LTRを使えるが、周囲の説明と操作はscopeのRTLを保つ。

## 階層・表・日程

Tree/TreeSelect/Cascader/OrganizationChartはraw IDと安全なDOM IDを分ける。`children:undefined`の未取得、`children:[]`の取得済み空、disabled/unknownを混同しない。遅延取得はrequest identityで旧応答を除外する。Escape・親への移動・popup終了はAPGに沿って所有focusを戻し、外部focusを奪わない。

Tableの列IDも任意文字列。列幅・pin・template・検証・pasteのrecordはown entriesだけを扱い、`__proto__`や`constructor`を特殊な業務キーに変換しない。セル/行のraw draft、選択、列配置、検索/複数条件、client/serverの責任を分離する。編集と貼付けは完全な検証後のintentを返し、アプリのack後に確定する。部分的に不正なrectangleを成功扱いしない。serverで未取得の行を出力へ捏造しない。

Schedulerは日/週/月/agenda、resource、時間帯、予定編集を持つ。明示timeZone、Instantのstart/end、local編集draftとDSTの曖昧/不存在を区別する。移動はrequest/cancelと現在request IDのackに接続する。backend更新と安全な再試行はアプリが判断する。

## 媒体・専門部品

FileUpload/DropzoneのCVAは直近に完全受理したFile batchで、アップロード完了ではない。rejectionで親のbatchを保持し、resetで修復する。id/requestIdを照合して古い進捗・再試行応答を拒否する。実送信・削除・認可・Undoはアプリが行う。

PDF、画像decode/crop、media再生、Spreadsheet計算はsource/request epochで古い結果を失効させ、所有worker/bitmap/timerを破棄する。回転画像は全領域へスクロールで到達させる。Galleryの明示停止やfocus停止を設定変更で勝手に解除しない。字幕source/順序変更ではcueと選択を更新する。

Chartは実ECharts renderer、Mapは実MapLibre、editorはCodeMirror/ProseMirror、Spreadsheetは実formula worker、FlowEditorはDagreの配置を使う。全文の値表・native選択・keyboard移動など、canvas/pointerだけに依存しない操作経路を残す。数値の0/欠損/不正や計算エラーを捏造した値へ変えない。小数目盛り・軸名・凡例・長いラベルを狭幅/文字拡大で確認する。

FlowEditor のノード名は空・空白だけを拒否し、その他のアプリ文字列をそのまま保持する。座標は有限の0〜1000000、keyboard移動は同じ境界で止まる。不正な欄は理由とaria-invalidを示し、親の図とその欄のraw入力を保持して修正を待つ。profile/辞書変更では入力DOMを作り直さない。同じ欄の値がアプリから変更された場合は新しい値へ同期し、古い検証状態を除く。外部の不正モデルは表と診断を保持し、canvasへ描画せず、アプリによる修復を待つ。

Code/Rich/MarkdownのCVAは編集内容。RichのJSON schema/URLを表示前に検証し、MarkdownのHTMLはAngular sanitizerへ渡す。`bypassSecurityTrust`で入力を無条件に許可しない。Chat/MessageComposerのCVAは入力中textで、送信intentのcurrent IDをアプリがcomplete/fail/unknownへ応答する。resetは旧ackを失効させ、明示リセット前の失敗と未確定draftを保持する。

## 配信と確認

生成consumerにはAngular/RxJS/CDKに加え、採用部品の正規runtime依存が必要。PDF/MapLibre/Sheet worker、MapLibre CSS、PDF fonts/cmaps/wasm/iccsは利用アプリのビルドで配信する。worker URLは利用アプリで明示し、CSPやbundler対応を実HTTPで確認する。第三者NOTICEとPDF fontsの原license/source kitを配布物へ含める。ソースcheckoutの`docs/ui-library-consumer-guide.ja.md`、`docs/dependency-license-audit.ja.md`、`scripts/build.mjs`が詳細と実例。

同期・一致検査とstrict AOT、生成後の独立consumer、実操作、axe、意味/視覚レビューは別の証拠。全ソースAST逸脱検査や実AT/Safari/SSR hydrationを実施したと推測しない。個別の業務保存・Undo・安全な継続の保証はアプリの責任。

日付書式のruntime切替では不正な未確定入力と現在表示中の書式を保持する。provider/prop変更だけでVALIDへ戻さず、入力の修復、明示reset/clear、calendar選択で新書式へ移す。数式workerのライブラリ所有の構造診断は辞書変更で再翻訳し、app提供workerの失敗本文は保持する。

ライブラリ所有の保持状態文言は `uiMessageState` の表示境界で現在の辞書を読む。条件分岐・件数・アプリ由来の値は操作時に確定し、辞書変更でWorker/取得/保存を再実行しない。明示 `set(appText)` は辞書keyと一致しても原文を保持する。`setMessage(parts)` はライブラリ文言だけを遅延評価し、動的な非翻訳部分は操作時の文字列を保持する。FileUpload拒否本文、Schedulerのprivate移動状態、Diffのvendor説明とJson表示診断も表示境界へ接続する。JSONの原文・技術的な型名/parse code/offset・純モデル診断は保持する。
