---
name: project-ui
description: Design and implement UI for this project using its persona profiles, two-layer design tokens, generated Angular components and Tailwind theme. Use for UI changes or explicit UI configuration work.
---

# プロジェクトのUI開発

[English / 標準の英語版](SKILL.md)

この手順の `project-context.md` と `references/docs/` は、`sync` 後の `.agents/skills/project-ui/` を基準とするパスです。インストール直後は[日本語の導入ガイド](../../docs/ui-library-consumer-guide.ja.md)を読み、同期してから生成Skillを利用してください。

## 最初に読む

生成先では隣の`project-context.md`を読み、利用者の目的・利用状況・制約、`default_profile`、各プロファイルの`guidance`とトークンの対応を確認する。利用アプリの正本YAMLと、同梱の`references/docs/design.md`を読む。説明文は設計の判断材料として使い、文章だけを根拠に設定値を確定しない。

## 設計と設定

1. 今回の利用者、必要な判断や操作、端末と利用状況、必要な情報を確認する。年齢や役割だけで書体・情報量・操作方法を決めない。
2. 既存の画面と部品を読み、採用するプロファイルを明示する。初期設定で固定するか、利用者が切り替えるかも決める。
3. 必要に応じて、プリミティブの配色・文字・余白の体系と、用途別のセマンティックトークンへの対応を提案する。新しい値や体系も作れる。同じ値でも役割が違えばトークンを分ける。
4. プレビューで目的に合うかを比較し、採用する設定を正本のYAMLへ反映する。通常時・ホバー時・フォーカス時・無効時・処理中・エラー時・情報欠損時の表示と、それらが重なる場合を確認する。コントラストの数値だけで採用を決めない。
5. `sync --dry-run`で差分を確認し、`sync`で生成する。生成物を直接編集せず、アプリの機能コードを生成専用ディレクトリに置かない。

生成先outputを変更する際は、固定Skillのownership.jsonと旧manifestから所有権を検査して移行する。registryがない従来v1は旧outputで一度syncするか、変更後のsyncに`--from-output <旧生成先>`を渡す。dry-runで旧ownedファイル・旧manifestの退役と新生成先を確認し、アプリ所有のimportはアプリ側で更新する。手編集・未所有ファイル・壊れたregistryをこの指定で上書きしない。rootにactive ownerは一つで、同じrootのsyncを並行実行しない。

## 画面実装

生成されたAngular部品と、同じセマンティックトークンを参照するTailwindユーティリティを使う。部品や画面から、具体的な色・余白の値やプリミティブを直接参照しない。新しい役割が必要な場合は、設定と部品の契約に追加する。

output内のtailwind.cssで生成したテーマを確認する。色はbg-color-action／text-color-on-action、書体はfont-family-body、文字サイズはtext-size-body、太さはfont-weight-bodyのように用途を区別する。余白はpx-control-x、角丸はrounded-control等の役割名を使う。

`guidance`と機能の目的に基づき、情報の優先順位、画面構成、補助説明、操作経路を設計する。すべての画面を同じレイアウトに揃えない。DOMや業務仕様全体をYAMLにも記述して二重管理しない。

プロファイルは有効なIDを選びdata-ui-profileで適用する。切替時にフォームや取得・実行状態を作り直さない。部品はnativeの意味、見えるfocus、処理中の再操作防止、入力保持、失敗と復旧を保つ。HTTP、業務上の安全範囲、実データUndo、更新重複防止は利用アプリが所有する。

一覧の検索・ソート・ページ・列配置はDataTableViewのTableStateで保持する。server処理ではアプリが状態からデータを取得し、部品は受信行を再処理しない。入力は生成されたCVA部品とReactive Formsを接続し、無効化・reset・離脱時更新・未確定の候補を検証する。非同期候補はqueryとrequestIdで古い応答を除外する。日付はcivil ISO日付、日時は明示タイムゾーン付きのローカル時刻契約として扱い、DST解釈とInstantへの変換はアプリが行う。GridListは実コンテナ幅とsize.grid-itemを使う。Iconは@lucide/angularをインストールしprovideUiIconsで必要なアイコンを登録する。APIの詳細は同梱の`references/docs/ui-components.md`と`references/docs/ui-library-api.json`を参照する。

Cardは各領域のテンプレート／投影とshow/collapseを接続し、hiddenで入力を保持する。Menuは再帰itemsを使い、親へのfocus復帰とTab退出を保つ。Dialogはnative modal/nonmodalを使い、アプリの終了保留はcloseRequested.preventDefault()で接続する。busyでUI終了を抑止し、完了後はcompleteまたは明示open=falseを使う。通知はautoDismiss=trueなら正のdurationSeconds、falseなら保持。共通NotificationHostでFIFO・同時表示数・重複を選ぶ。modal内の操作付き通知はuiNotificationScopeとその内側のhostを用い、native modalの背景抑止を維持する。確認結果はUIの意思表示であり、保存成功・実Undo・未保存判断はアプリが所有する。

## 検証

公開ベータの導入・更新・中断復旧は、同梱の[ベータ利用契約](../../docs/npm-beta-readiness.ja.md)を読む。API・設計・導入・更新の利用者文書はこのSkillの`references/docs/`にある。利用アプリのルートに開発元のdocsが存在するとは仮定しない。

checkで設定と生成物を照合し、型検査/ビルド/対象操作試験を実行する。利用アプリでは保存されたプロジェクトコマンド、またはアプリのルートから`./node_modules/.bin/ui-foundation`を実行する。チェックアウトは不要。checkはYAMLのchecksで指定したAngular/CSS/SCSSソースの逸脱を検査する。動的な式などの未確認は警告として残し、UX全体の合格と扱わない。取り込み先ではoutput内のcheck-ui.cjsをNodeで実行する。検査器とpolicyは手編集せず再同期する。

各採用profileで狭い画面、文字拡大、キーボード、動きの低減、正常/処理中/エラー/欠損/復旧を確認する。描画・操作・自動アクセシビリティ・意味レビュー・利用者確認を分けて報告する。未実行を合格扱いしない。詳細な判断例は必要時に[参照](references/token-design.md)を読む。

配置部品は`references/docs/ui-components.md`の配置とコンテナを参照する。Gridのbreakpointsはcontainer幅、ResponsiveVisibilityはviewport幅。stickyは直近scroll領域内で作用する。Panel/Accordion/Splitterや領域の非表示で入力を破棄せず、focusを隠れた部分から退避する。必須操作を幅だけで除外するかは利用アプリの目的に照らして判断する。

操作部品は`references/docs/ui-components.md`の操作部品を参照する。native button/linkと処理中のcapture guardを保つ。Toggleのaccessible labelは状態によって変えずaria-pressedを使う。SegmentedControlは選択方式に応じたCVA値をアプリが用意する。等幅指定でも狭幅・文字拡大でラジオ/アイコン/文字が各選択枠内に収まり、必要なら行が折り返すことを確認する。長いlegendも連続英字を含めて部品内へ収める。Toolbarは実幅による退避時と復帰時のfocusを確認する。CopyButtonはwriterの成功後だけ成功を表示し、拒否・再試行・表示期限・破棄後の結果を検証する。

通知一覧と状態表示は`references/docs/ui-components.md`の該当契約を参照する。ActionFeedbackの結果不明、AsyncRegionの部分欠損/古い情報を成功へ置換しない。通知一覧のread/delete/loadMoreと進捗/領域抑止のcancelはアプリへ要求を返し、backend成功を部品で先取りしない。表示切替で入力とfocusを保ち、busyで無効になる操作は状態説明へfocusを残す。Spinnerの遅延、native progressの不定、Skeletonの動き低減、対象だけのinertを実操作で確認する。Tourは実HTMLElementを対象にして非modalで案内し、表示済み/再開/対象喪失/終了復帰を検証する。directive付き要素のqueryはElementRefを明示してnativeElementを渡す。

日付のtoday／期間のinitialMonthの省略時は部品作成時の端末ローカル日付を使う。業務タイムゾーンや午前0時の更新は明示値を接続する。Alertの組込み操作が外部更新で消える際は本文へfocusを残し、別の操作や入力のfocusを奪わないことを確認する。

## 文字・情報・数値表示

- native見出し/強調へTypographyを付け、実タグで階層を保つ。意味色は対応surfaceと組にし、nowrapの局所scrollとアプリ指定tabindexを確認する。
- Badgeの上限99+にも完全件数の説明を残す。Tagの選択/削除は別native操作にし、削除は利用アプリへの意図として接続する。外部非表示/無効化と削除前のfocusを確認する。
- Avatar画像失敗は代替説明と氏名のグラフェムを保ち、src変更で再取得できる。AvatarGroupの超過一覧はnative detailsで確認でき、表示上限変更で操作が消える際のfocusを保つ。
- Descriptionsはnative dl/dt/ddとtyped DescriptionTemplateを使い、0/false/空文字/未取得を区別する。StatisticはIntl書式と比較値を残し、比較値0の百分率を数値に偽装しない。増減の良否はアプリが判断する。
- Meterは既知範囲のnative meter、進捗はProgressBar。未知値は説明し、MeterGroupでは未取得区分を0/空き容量と扱わない。finite/range/threshold/order/sumを検証する。RTLでは値/単位/上限と合計/上限をbidi隔離し、不均等な値の実描画順も確認する。
- HelpTextのidをaria-describedbyへ明示接続し、ShortcutHintはnative kbdと必要な読み上げlabelを使う。キー実行はアプリが接続する。
- ReadMoreは実overflowを観測して全文/折畳みを切り替える。全文を捨てず、短文化/行数/幅変更でtoggleが消える際のfocusを確認する。
- CodeBlockはpre/codeの文字補間で安全に表示し、整形失敗も原文を保持する。JSONの重複キー・生数値/文字列トークンを失わない。行番号はsource lineごとのrowへ置いて折返し/空行との対応を保ち、支援技術とコピーから除く。実Clipboardと失敗/再試行/表示時間を検証する。応答待ち時にCopyButton内へfocusを保持し、完了時は自前focusだけを復帰する。外部copyable=falseでfocusをコード領域へ保持し、破棄後の結果出力を抑止する。
- Watermarkはnative SVG pattern/論理位置/濃度を実描画し、aria-hidden/pointer-events:noneで入力・操作を遮らない。認証やコピー防止を保証する部品として使わない。
- Avatarの代替頭文字は画像の寸法に収め、small/medium/largeと拡大表示で折返し/clipを検証する。
- font.code/size.avatar/opacity.watermarkを設定正本で対応付ける。opacityは0〜1のsemantic CSS、書体/寸法は対応するTailwind namespaceへ同期する。

契約の全propとapp責任は、このSkillに同梱した`references/docs/ui-components.md`の文字・情報・数値表示を参照する。

## フォーム基盤と構造化入力

- FormFieldのlabelPositionはlayoutを継承し、FormLayout/FormGroupでcolumns/direction/semantic gap/size.form-labelを使う。幅とprofileを変えてもnative editorを再生成しない。FormGroupのnative disabledとAngular form.disable()によるvalidation除外を区別する。
- Textareaは幅・profile・hidden復帰でもautoResizeを確認する。SearchInputの非同期候補にはsuggestionsQueryとsuggestionsRequestIdを必ず渡し、同じ検索語と同値resetの古い応答/待機を破棄する。静的候補だけIDを省略できる。
- ComboboxOptionのtyped contextを使い、候補内へ独立した操作を入れない。native popoverと共通Overlayを使い、modal内、Escape→Dialog、Tab/outside、狭幅/RTLと連続キーを実操作で確認する。
- MaskedInputはraw CVA値と書式付きnative表示を分け、未入力placeholderを値へ入れない。不正draft/超過/IME/区切り削除と再入力を保持し、clearIncompleteOnBlurの明示設定だけで途中入力を消す。OTPは先頭0と全コードを保持し、桁違いを切り詰めない。one-time-codeはDOM契約で、認証とOS自動入力の成功はアプリ/環境側にある。
- TagInputはcollectionにrequired/max/duplicate/候補検証を接続し、空のnative editorのrequiredと混同しない。拒否draftと復元された値を残し、個別削除でeditorへfocusを移す。RadioGroupはnative矢印、CVA初期値/reset、個別disabledとグループ離脱を確認する。
- FormActionsはnative submit/resetとcancelledの意図を接続する。busyで再操作を抑止して入力を保持し、自前focusだけを戻す。実保存/取消/Undoの結果は利用アプリが所有する。全prop、入力書式、nullable reset、template contextはreferences/docs/ui-components.mdの契約を参照する。
## 端の領域と浮動表示

- Drawerはnative dialogへuiDrawer、BottomSheetはuiBottomSheetを付け、Dialogのslots/終了保留/結果を使う。左右上下のedgeは物理位置。専用size.drawer-inline/blockと正のpixel寸法、Sheetの昇順比率とnative段階操作を接続し、段階/profile/幅変更で入力を作り直さない。
- Popover/Tooltip/HoverCard/ConfirmPopoverへ実HTMLElementのanchorを渡す。component/directive付き要素はviewChildのread:ElementRefを明示する。native top layerでも元のprofile/RTL/DOMを保ち、modal内のanchorと内容は同じmodal内へ置く。
- Tooltipはmessage/role=tooltip/aria-describedbyだけで操作を入れない。遅延、Escape前後、hover/focus保持、説明参照の所有範囲とtimer破棄を確認する。HoverCardの補助操作へkeyboard/明示clickでも入れるようにし、必須情報をhoverだけへ隠さない。
- Popoverのheader/body/actionsにはtyped uiPopupTemplateを使う。終了理由/同期保留/busyをアプリへ返し、scope喪失/hidden/破棄で終了保留を延命しない。連続Escape、外部focus、対象変更、狭幅/RTL、入力保持を検証する。
- ConfirmPopoverのconfirmRequestedは意思表示。要求直後からbusy反映までの終了抑止と、busyを立てない場合の次描画後の取消を分けて検証する。busy/error/retryを接続し、結果後にcompleteまたは明示open=falseを行う。保存/Undoを先取りしない。全propと責任範囲はreferences/docs/ui-components.mdの端の領域と浮動表示を参照する。
- 共通Escapeと表示待ちの取消は子のキー処理後に行い、defaultPrevented/IME変換中は処理しない。連続Escapeのbusy/終了保留、非modalの外部focus、hiddenのDrawer/Sheetでmodalが解放されることを確認する。documentElementを含む根スコープのdir/profile/style/inert変更でも再配置と後始末を確かめる。キー以外のnative終了要求の保留は保証しない。最上位が終了保留の場合もEscapeを消費し、下位のDialogを閉じない。詳細は`references/docs/ui-components.md`の浮動表示の契約を参照する。

## ナビゲーションとコマンド

- サイト移動はnative nav/list/link、階層はSideNavのdetails/summaryを使う。Menu/Menubarの複合widget操作と区別する。URL/currentとRouterはアプリが決め、親のhref、disabled/visible、全ラベルを保持する。折畳みの幅はsize.navigation-rail、MegaMenuはsize.mega-menu/navigation-columnへ設定正本から対応付ける。
- Breadcrumbの中間階層はnative detailsへ残す。外部collapse/項目除去では自前focusだけを親summaryへ戻す。closed detailsの子は矩形が残る場合があり、矩形だけでfocus/Tab候補/overlay対象を判断しない。
- Tabsはmanual activationの縦横/RTL、局所scroll、個別disabledを接続する。closeRequested/orderChangeを受けるアプリが未保存判断、実データ除去/並べ替え、selected更新を行い、安定idで同じnative editorを保持する。最後のpanelにはallowEmpty/focusFallbackを明示する。Arrow/Home/End/Enter/Space/Delete/Alt＋方向と表示上の操作を確認する。
- AnchorNavigationへ実target/同一documentのscrollRootを渡す。hash、実scroll、移動余白、現在位置、target focus、reduced motion、sticky host、対象喪失とmargin/tabindexの所有範囲を確認する。固定領域の予約余白は画面が確保する。window/領域内のscroll-padding-block-startとoffsetの合計で移動/現在位置を照合し、比率・calc、CSS priorityの復元と後からのアプリ変更保持も確認する。
- Menubarのroot rovingと再帰Menuの階層focus、左右によるroot間移動、Tab全体退出、disabled/typeahead/check/radio、描画前の連続キーを確認する。Rootは操作項目、group/separatorはpopup内に置く。MegaMenuはgroupの見出し/説明とnativeリンク/階層を使い、全リンクへTabで到達できるようにする。
- CommandPaletteはnative modal Dialogとcombobox/listboxを使い、検索/グループ/明示shortcut/呼出し履歴を接続する。commandRequestedは実行の意思で、busy/error/再試行/completeはアプリ結果を反映する。成功履歴やbackend更新を先取りしない。通常の入力/defaultPrevented/IME/repeat/別modalを横取りしない。検索と同じnative editorを閉じ戻る/候補差替えでも保持する。狭幅・拡大で開いた直後、矢印移動、エラー、再検索の検索欄とEnterの対象操作名の可視を、dialog/listbox/viewportのclipと実hit-testで確認する。長いエラーの先頭/末尾の局所scrollと再試行へのTab経路、候補0件時の復旧領域も確認する。再試行buttonの除去前に自前focusを保持した検索欄へ戻し、busy中の重複要求を抑止することを実操作で確認する。検索領域の実高さ変更と破棄後のobserver/描画予約の解除も確認する。
- 方向・profile等の外部設定変更後の試験は、実DOM/ARIAへの反映を観測してからキーを送る。固定sleep/retryでraceを隠さない。全propとアプリ責任はreferences/docs/ui-components.mdのナビゲーション各節を参照する。

## 数値・色・編集・段階・条件

- Slider/RangeSliderはnative rangeとmin基準の正のstep、Knobは同じnative rangeとSVG指針/明示増減を使う。size.knobを設定正本の各profileへ対応付ける。不正modelはvalidationと説明へ残し、表示fallbackをmodelの成功へ読み替えない。native矢印/Home/End、範囲の交差抑止、pointer取消とkeyboard代替、readonly/CVA disabledを実操作で確認する。
- Ratingはnative radio群の整数/半段階と0の解除を接続する。ColorPickerはhex/rgb/hsl、alpha、native color/rangeとpaletteを接続する。focusで入力文字を差替えず、不完全raw値を保持する。blur時の書式変換、alpha0、透明度OFFの不正値、paletteのみの設定、native editorの同一性とprofile変更を検証する。
- InlineEditのsaveRequestedとrequestIdに実アプリ結果を接続する。complete/failは一致する未完了要求とpreviousValueへだけ適用し、失敗draftを残す。busy中の明示completeは確認済みCVA値を公開できる。CVA resetと反映済み[value]の外部変更で旧要求を失効し、同じeditorを同期する。連打、Enter/Escape/IME、外部focusを確認し、backend保存やI/O取消を先取りしない。
- Wizard/Stepperはprojected WizardStepをhiddenで保持する。nextのundefinedは次の有効段階、nullは完了、IDは明示分岐。canProceed/disabled/分岐変更で古い保留要求を失効させ、戻るは実移動経路を使う。deferTransitionsのapprove/rejectはアプリの業務判断に接続する。見出しへの自前focus、入力DOM保持、段階除去、完了/再開、入れ子の所有範囲を確認する。
- FilterBuilder/QueryBuilderはtyped field/operatorと再帰AND/OR、0/false/未取得を区別する。compileFilterはown propertyだけを評価し、空グループは絞り込みから除く。不正条件は結果を捏造せず復旧経路を残す。保存はアプリ結果、saved snapshotはUI内の復元。fieldsのID/説明/型/選択肢変更や再検証errorは保留saveを失効させ、旧complete/failを拒否する。復元modelとnative選択表示の一致、全型/入れ子/解除/readonlyを確認する。親signal変更と旧応答を同じturnで扱う場合は、InlineEdit/FilterBuilderのinvalidatePendingを親変更前にアプリから呼び、未反映の親状態を自動検出する保証を作らない。SQL、コード実行、通信は持たない。全propとapp責任はreferences/docs/ui-components.mdを参照する。

## 一覧・選択・仮想化・移動

- 生成consumerはAngularとRxJSに加え`@angular/cdk`の互換版を導入する。公開scrolling/drag-drop APIを用い、private内部や別Overlayをpatchしない。size.collection-item/collection-viewportをYAML正本のprofileへ対応付ける。CDKの依存と利用条件は`references/docs/ui-library-consumer-guide.ja.md`と`references/docs/ui-components.md`を参照する。
- List/Masonry/DataViewは安定keyとtyped uiCollectionItemOfを使う。template indexはfiltered絶対位置、pageIndexはページ内位置。行操作はnative操作にする。DataViewの機能OFF、範囲外pageのstate補正、list/gridで同じeditor、異なる高さのMasonryとDOM順を検証する。
- Listbox/SelectionListのoption templateは表示用とし、内部へ独立button/linkを置かない。CVA不正値はエラーとして保持し、明示app resetで修復する。検索のhidden/disabled選択を勝手に解除しない。既定の仮想行は意味tokenを下限にグループ名とラベルの文字行を測り、拡大時も両行を欠かさない。明示itemHeight/投影内容の固定行高と局所scrollはアプリが確認する。仮想groupは描画済optionだけをaria-ownsで接続し、Chrome AX treeでgroup/option/active参照を観測する。
- VirtualListは固定行高を契約とし、1000行の実DOM数、終端/scroll position/先読み、profileと文字拡大の再測定、破棄、行内focus退避を確認する。仮想DOMの外へ消えるeditor値はアプリがkeyへ保存する。VirtualList/Listboxの自前仮想行幅は公開viewportのclientWidthに従う。長ラベルのellipsis/水平scroll、LTR/RTL/200%と親幅/profile変更、投影editorの幅・DOM・値保持を確認する。CDK内部wrapperはpatchしない。
- 仮想行へ分かれたnative radioはVirtualList/VirtualDataTableのradioGroupsへ全memberの行key/value/effective disabled/hiddenとcanonical valueを渡し、native changeでappがvalueを更新する。動的modelはreadonly Signalのまま`[radioGroups]="groups"`へ渡し、親bindingのフレーム反映を待たず最新値を読む。表singleの動的selectedKeysもSignalのまま渡せる。form省略はviewportの継承form、別formはidで明示する。選択値をDOMへキャッシュせず、reset/拒否/再順序/削除もappのmodelへ反映する。表の組込みsingle選択はselectedKeysへ内部接続済み。TabとArrowの既定動作を保ち、同一行の複数option順はDOMに従う。未選択groupのTab入口と利用不可checkedの扱いは同一engineのnative参照と比較する。Firefox/Chromium/WebKitの内部Tab方針を持ち、Arrowのwrapや選択はbrowserへ委ねる。macOS WebKitの全controlへのTab試験はtest processだけAppleKeyboardUIMode=2で起動し、利用者の設定DBは変更しない。未検証engine/OSやUA偽装の動作は合格としない。groupの別viewport/外部member共有、正のtabindexやshadow DOMは別途検証する。
- Sortable/Transferはpointerとbutton/keyboardの同じ移動許可を使う。app snapshotが変われば古いdrop/keyboard draftを拒否する。移動中Escapeは共有Overlayのoperationに登録し、子defaultPrevented/IME/新しいpopupを優先する。取消後の次Escapeは親へ届く。CDK endedより後のdropまで開始snapshotを保持する。
- InfiniteScroll/Timelineは同じ要求を出したhostへid付きcomplete/failを接続する。破棄/明示失効/reset後の古い応答、連打、error/再試行/終端、実IntersectionObserverを確認する。contentVersionは実追加/カーソル進行時だけ変更する。backend更新/通信取消/実Undoはアプリが所有する。
- 組込みnative操作が無効/除去となる際は部品内の説明可能なhostへ自前focusだけを残し、投影された入力と外部focusを奪わない。自前focus先は状態更新後の文字と枠を実viewport・局所clip・hit-testで確認し、対象が画面外なら描画後に表示する。外部focusと画面位置は応答で動かさない。全prop/責任範囲はreferences/docs/ui-components.mdを参照する。

## 全カテゴリのruntime基盤と専門部品

Calendarは狭幅・文字拡大・LTR/RTLで、初期focus・矢印移動・月切替の対象日の数字が局所領域内で見えることを確認する。月・年のnativeボタン操作ではボタンfocusを残し、更新後の日付tab-entryの数字が見えることも確認する。Dialogの最大化中・busy中の移動／サイズ変更はnative disabled表示を確認する。連続したnativeキーで移動・サイズ変更が累積することを確認する。FormDialogは保存待ちの状態説明、失敗後のfocus復旧、利用者が移した入力focusの保持、成功終了時の呼出元への復帰を実操作で確認する。

Kanbanの移動先selectは所在列・モデルと一致し、移動後の再作成でも一致することを確認する。列移動と先頭／末尾への順序移動後は、focusしたカード名とfocus枠が局所scroll領域内で読めること、Tabで続けられることを確認する。FlowEditorはSVG接続端と実nodeの位置・中心を照合し、長文・文字拡大・zoom・自動配置で実高に追随することを確認する。接続ラベルの全文と接続との対応、node/edge削除後の自前focusと外部focusの保持も確認する。Filterの固定演算子は入れ子・狭幅・文字拡大でも全文を読める既定表示を使い、語尾の省略で肯定／否定を曖昧にしない。

フォーム・locale/日付書式・RTL/CDK Directionality・全カテゴリのプロファイル接続、Tree/Scheduler/編集表、媒体と専門部品を使う場合は、生成Skillに同梱する[利用契約](references/ui-library-runtime.md)を読む。部品は必要な画面だけで使用する。このSkillに同梱した`references/docs/ui-library-consumer-guide.ja.md`で正規依存とworker/asset/NOTICEの配信手順、`references/docs/ui-components.md`でカテゴリ別APIを確認する。API目録は利用アプリの検証成功を証明しない。配布外の過去ログを必須入力にせず、導入先で行った検証を記録する。実送信・保存・取消・Undoの成功をUIだけで確定しない。

TransferList/PickListのCVA値は安定キー配列またはnull。左右のnative checkboxは現在検索scopeの一時選択で、disabled/hidden/検索外の値を削除しない。追加上限はbatch全体で判定し、削除で上限超過を修復できる。未知・重複・不正モデルはValidatorで説明し値を保持する。callbackは同期・純粋で指定時trueのみ許可、例外は拒否する。pointer/draftは同じsnapshotとcanonicalキーを使い、同一turnのapp更新前にinvalidatePendingで古い操作を明示失効できる。
Timeline/ActivityLogはoffset付きinstant、明示timeZoneとIntlで日時を表示し、missingとinvalid日時/種別を分ける。native detailsは投影DOMと編集を保持する。追加取得は同じTimeline/InfiniteScroll hostの未完了idにcompleteLoad/failLoadでackし、受理を確認してappがデータを追加する。IDは恒久・別bundle間一意を保証しない。reset/query更新前にはinvalidatePending、loader再作成・破棄後の古い結果は拒否する。実I/O/保存/Undo/業務認可はappが所有する。

条件保存・数式の再計算・媒体の再生／再取得では、native Enterで自前操作から処理状態へfocusを保持し、失敗後の再試行、成功結果、利用者が移した入力／外部focusの保持を確認する。
