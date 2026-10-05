# 共通UIライブラリの拡張計画

[依頼原文](ui-library-request.ja.md)と[要求マトリクス](ui-library-matrix.json)を正本として、全カテゴリ・制御項目を追跡する。baselineは初版の状況、statusのpartialは要求行の一部を実装・検証した状態、verifiedはその行の制御項目を段階検証した状態。全要求の完了は別に判定する。部品名の登録、汎用ラッパー、未実装stub、コンパイル成功だけで完了へ変更しない。

## 利用と責任

利用アプリの開発者が、必要な部品とプロファイルを選び、業務状態を接続する。検証画面は部品ごとの操作確認用であり、特定の業務画面へ全一覧を配置する指示ではない。HTTP、実データUndo、アップロード、結果不明の確認、安全な継続、永続化は利用アプリが所有する。

UI intent: screen_type=component verification workspace、user_decision=部品の状態と操作契約を確認、first_view_payload=現在の部品/状態/操作、primary_action=対象操作の実行、delete_list=無関係なHero/全部品強制配置/説明の重複。

## 段階と観測

1. 全要求を保存し、生成所有権と既存設計を確認する。現mainはPR #1のmerge済みHEAD 618ce052。専用branchを使い、既存作業へ上書きしない。
2. 最新の明示優先に従い、DataTable/Pagination→入力/セレクター→Calendar/日付入力→GridList→Iconの順で実装する。既存のnative table adapterを保ち、列定義を持つDataTableViewを追加する。表はsort/filter/search/pagination/width/sticky/column layout/selection/action/detail/style/client-server/stateを先行して検証する。
3. 優先カテゴリの後、Overlay/focusと操作基盤→Card全slots、再帰Menu、Dialogの終了理由/保留、Snackbar/通知ホストの順で重点契約を実装する。ネイティブdialog/popoverは同じDOMスコープ内に置いてプロファイルとRTLを保持する。
4. フォーム/一覧/検索を中心にButton拡張、IconButton/ButtonGroup、Popover/Tooltip、ConfirmDialog/Drawer、Alert/Toast/Spinner/Skeleton/ProgressBar/EmptyState、Badge/Tag/Descriptionsを拡充する。Navigation/Breadcrumb/Tabs/Disclosure/PageFrameも再利用して拡張する。FileUpload/UploadList、Stepper、Tree/TreeSelect、virtual list/table、cell edit、aggregate/group、CSV exportと他の全要求も後続段階で実装し、元の要求から削除しない。リサイズ/並べ替えはpointerとキーボード/ボタンの代替を持つ。仮想化はfocus保持、非同期候補は古い応答の破棄を観測する。
5. 専門部品は成熟したライブラリのAngular 22適合性、ライセンス、セマンティックテーマ、キーボード/データ意味を評価し、実装とconsumer操作を検証する。有償サービス/ライセンス同意は別途判断する。

各段階で設定/テンプレート/Skill/生成/デモ/検証を揃える。同期はdry-run→sync→check、検証はtypecheck（strictTemplates）/AOT build/対象操作/axe/描画/外部consumer/独立レビュー。具体値の正本はYAML、部品は意味トークンだけを参照する。設定/一致検査、実操作、axe、AIによる意味/視覚レビュー、人の確認を区別する。

## 重点4部品の受入条件

- Card: header/body/footer/media/actionsを個別に投影/テンプレート差替えし、表示・配置・余白・appearance・collapse・loadingを制御する。hiddenやcollapseで入力を破棄しない。loadingで本文の状態を保つ。
- Menu: childrenを任意の階層に展開し、command/checkbox/radio/group/separator、icon、disabled/visible/checkedを表現する。矢印/Home/End/文字検索、階層開閉、親focus復帰、Tabで退出、Escape、click/hover/context、配置、closeOnSelectを検証する。
- Dialog: native modal/nonmodal、header/body/footer、close/escape/outside条件、size/position、drag/resize/maximize/busyを制御する。requestイベントは同期保留でき、未保存確認の後でアプリが明示的に閉じる。close理由とreturnValueを返す。入力・focus・背景操作を観測する。
- Snackbar: ONは有限の正の秒数（5なら5秒）を要求し、OFFは秒数を参照しない。hoverとfocusの重複pauseを扱い、残り時間でresumeする。close/action/timeout理由を分ける。通知ホストはFIFO、maxConcurrency、dedupを持ち、queued通知のtimerは表示開始から数える。

## 生成と残件

PR #1のoutput変更時にSkill所有情報が失われる指摘は現行src/sync.tsにもある。今回の出力先を変える必要はないため、既存生成物の手削除で回避しない。出力移動の実装時には旧manifestを明示的に検証する移行経路を別差分で追加する。

全要求完了までマトリクスとIssueをopenで管理し、段階完了を全体完了としない。Draft PRを提出し、merge/Ready化/npm公開は行わない。

## 参照（2026-10-05に公式ページを確認）

- [PrimeNG Card](https://primeng.dev/card): 領域とテンプレート構成の比較。
- [PrimeNG Table](https://primeng.dev/table): sort/filter/selection/width/frozen/edit/group/exportの比較。
- [PrimeNG Toast](https://primeng.dev/toast): 時間・保持・position・stackの比較。
- [Ant Design catalog](https://ant.design/components/overview/?locale=en-US): カテゴリ漏れの確認。
- [APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)、[menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)、[menu](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)、[dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): 対象パターンのfocus/keyboard/ARIA契約。

routing: implementationのprimary_skillはリポジトリのskills/ui-development/SKILL.md。ui-ux-routerはAGENTSの選択を維持し、Angular実装はangular-implementation-architecture、要求整理はspec-driven-developmentを適用。
