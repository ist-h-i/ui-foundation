# 独立 UI レビュー

判定は **verified（今回依頼された範囲）**。既知の指摘であるセレクター矢印の端余白、表編集操作の強調と配置、および変更部品の代表的な編集・失敗・復旧経路について、適用される重要な条件を実画面と実操作で確認した。解消を要する重大な不具合は観察していない。これは全181部品・全状態・全ブラウザの保証ではない。以下の未確認項目を合格には含めない。

## 独立性・契約・対象の同一性

レビュー担当は実装担当とは別の `/root/independent_ui_review`。初期画面を先に観察し、その後に現diff/sourceを確認した。過去のレビュー判定と実装者の診断は判定根拠にしなかった。製品・生成物・設定・試験を変更せず、sync/build/git mutationを行っていない。独自の測定・操作スクリプトと証拠だけを `/tmp/ui-foundation-ui-review-20261009/` に保存した。

読取契約は AGENTS.md、docs/project-brief.ja.md、docs/design.md、docs/implementation-plan.md、docs/development.md、skills/ui-development/SKILL.md、.agents/skills/project-ui/project-context.md、examples/ui.config.example.yaml、docs/ui-library-table-expansion-spec.ja.md。独立レビュー手順は ui-review/SKILL.md と rendered-review.md、共有原則は ui-contract/references/principles.md。機械設定の正本は YAML として扱った。

2026-10-09〜2026-10-10 UTC に macOS / Chrome 154.0.8037.98（headless）、プロジェクトローカルPlaywrightで確認した。起動と操作は `node /tmp/ui-foundation-ui-review-20261009/review-console.mjs`、保存した測定・操作モジュール、および再開後の `resume-media.mjs`。native Enter / Escape / F2 / Tab、ポインターのclick/hover、native select変更を用いた。採取した代表PNGは担当者が `view_image` で直接観察した。リポジトリのbrowser testsや親担当のaggregate結果をこのUI判定の代替には使っていない。

| 項目 | 確認した値 |
| --- | --- |
| PR候補head | `5c0b545d68cf2b3fdad06aa35b7298e49e9e9221` |
| base | `eeae8a9952489dc406fb70a478e25974ca695017` |
| branch | `feat/component-ui-ux-review` |
| 固定サーバー | `http://127.0.0.1:4229` |
| 固定build | `/tmp/ui-foundation-pr-20261009/review-build/dist/fixture-app/` |
| 固定入力manifest | `/tmp/ui-foundation-pr-20261009/ui-review-candidate.json` |
| 入力manifest SHA256 | `63732621c1be6e2ce9f3fda024c4d6f11769bf2964ca8a2365ecd168e62e461b` |
| HTTP `/main.js` SHA256 | `06dc140f93f029b7a14347975ded98720f4b4ba3f61aab2f7649ed00d6b7f447` |
| 最終対応確認時刻 | `2026-10-10T00:19:12.081Z` |

固定runtimeは309ファイルすべてmanifestと一致し、再起動後の配信main.jsも同じハッシュだった。480入力ファイルの差異は `tsconfig.ui-runtime.json`、`tests/ui/async-retry-focus.spec.ts`、`tests/ui/diagram-connection-geometry.spec.ts` の3件。diffで noEmit検査の `allowImportingTsExtensions:true` と、描画・操作解除を待つ試験同期のみであることを確認した。製品runtimeの変更はない。証拠文書を加えた後のexact final headは、このレビュー終了時点ではまだ対応監査前である。

## 条件ごとの判定

「pass」は記載した観測範囲に限る。主条件のfailは0件。範囲外の保証はunverifiedとして残す。

| 条件 | 判定 | 観察・証拠 |
| --- | --- | --- |
| 実画面からの独立レビューと固定artifact対応 | pass | 初期画面、480入力/309runtime/HTTP hash。`01-initial-observation.json`, `final-identity-check.json` |
| spacing・操作群のまとまり・入力との配置 | pass | `/catalog`・`/catalog/tables` と15追加routeの初期viewport、専門12パネルの実画面。見出し・説明・入力・操作のまとまりと改行を直接確認。`catalog-route-observations.json`, `specialist-observations.json` |
| 操作の強調 | pass | primary保存と補助操作が区別され、表のidle編集は透明背景の静かな補助操作、hover/focusで所在が分かる。初期・focus・編集失敗PNG |
| セレクター矢印の端余白 | pass | guided/dense × 1366/320px × 100/200% × LTR/RTLの16条件、各14select＝224観測。SVG枠のinline-end insetはguided24px/dense16pxで一定。`select-matrix.json` |
| セレクター文字領域と矢印のclearance | pass | 文字line-boxの終端とSVG枠の間はguided13px/dense9px。200%やRTLで矢印との衝突を観察しない。長文の完全表示は別の制限として下記に記録 |
| 表のidle/hover/focus予約幅と隣接列 | pass | DataGrid16条件、Native DataTable cell/row32条件。状態間のセル幅変化の最大値0px。cell編集予約幅44px。row操作は文言と文字サイズに応じた幅で、同じ条件内の状態変化では不変。`table-matrix.json`, `native-table-matrix.json` |
| header/cell alignment | pass | DataGridとNativeの5leaf headerについて対応セル幅差の最大値0px。代表PNGで内容のinline-start、隣接列、quiet edit位置を直接確認 |
| native keyboard編集・取消とfocus可視性 | pass | DataGrid F2/Enter編集、Escape取消。Native cell編集とrow編集をEnterで開始し取消。取消後に元表示と起点focusを確認。`table-interactions.json`, `native-table-cell-cancel.json`, `supplemental-table-keyboard.json` |
| 入力制約の拒否と保持 | pass | 必須の申請名の空白入力を拒否し要求数0、raw空白を保持、aria-invalidと説明を確認。FilterBuilderの数値に文字を入れたケースでも保存に進めず値とエラーを保持。契約外の新たな値制約は導入していない |
| 正常/処理中/エラー/再試行の意味 | pass | DataGrid、FilterBuilder、Palette、FormDialog、Spreadsheet、Chatの代表経路で状態文言と再操作の所在を確認。Native tableの欠損値は「未取得」、数式worker失敗は原文保持を説明し成功と区別 |
| input・外部focus保持と繰返し操作 | pass | DataGrid/Filterは失敗・再試行後にdraftと外部応答buttonのfocusを保持。Spreadsheetはworker失敗中の編集を保持、再計算後も外側profile buttonのfocusを保持。pending Enter反復の要求数抑止を実測。Palette検索語は完了/再開時も保持 |
| cancel/close後の状態と次の操作 | pass | DataGrid取消は未確定draftを破棄して元値へ。FormDialogのdirty終了保留、編集継続、明示破棄、再開、保存完了と起点focusを確認。再開時のdraftはアプリ所有の値として保持される |
| narrow/拡大/RTLでのアクセス | pass | select/表の全条件でdocument水平overflowなし。広い表はローカルscroll領域を使用し、実際にscrollLeft 0→200を確認。Filter/Palette/FormDialog/Kanban/audioの代表320px・200%画面を確認 |
| Chat/Paletteの外部応答buttonが無効化されるケースの安定した外部focus保持 | unverified | 応答click後にBODY focusを観察した。応答button自身の状態が変わる経路なので、独立して存続する外部操作へのfocus保持の合格根拠には含めない |
| valid動画・全画面・実コーデックでの復旧 | unverified | 空sourceによる取得エラーとnative retry後も同エラーを確認。動画source未提供のため成功復旧は主張しない |
| OS文字サイズ、ブラウザ全体zoom、他ブラウザ、実支援技術、forced-colors | unverified | 200%はdocument root font-sizeを200%にしてtoken由来の文字拡大を実測。OS/browser zoomやATの実利用とは同一視しない |
| 全181部品×全状態と第三者renderer全境界条件 | unverified | route初期画面・12専門パネルと下記代表経路のレビュー。全組合せのUI合格を主張しない |

## 実操作で観察した代表経路

- **DataGrid**: guided320px/200%/LTRとdense320px/200%/RTLでF2取消→空白拒否→有効draft→pending Enter反復（要求1）→外部失敗（draft保持）→native Enter再試行（要求2）→外部確定→再編集取消。欠損と金額0を同一視しない表示を確認した。
- **FilterBuilder**: nested/deep条件を復元して実際のinput/model描画を確認、金額14・件名「独立確認メモ」を編集。保存反復は要求1、失敗後も階層と値を保持、外部応答buttonのfocus保持、再試行要求2、完了status。dense320px/200%/RTLに変更しても同値を保持した。
- **CommandPalette**: guided320px/200%/RTLで「保存」を検索→Enter実行→反復抑止→長い失敗文→Enter再試行→完了close→再開時に検索語保持→Escapeで起点focus。長いエラーは内部のスクロール対象になり、再試行操作がある。応答buttonの無効化後のBODY focusは上記の未確認扱いとした。
- **FormDialog**: native保存、pending反復、失敗時入力保持、320px/200%エラーの折返し、dirty取消の保留と編集継続、明示破棄、再開、保存成功と起点focus。
- **Spreadsheet**: 実worker URL `/assets/sheet-formula.worker.js` のブラウザnetwork abortで実行エラーを起こした。F2/Escapeで取消、A1を9へ編集して原文を保持。networkを復旧し、実URLへの200ms遅延付き要求でpendingを観察、Enter retry反復。要求3のまま計算済みとなりC1=12/D1=24、外側profile buttonのfocusを保持した。これはネットワーク失敗を注入した実runtimeの復旧観察であり、本番障害率の測定ではない。
- **Kanban/Diagram/Chat**: native並替え、WIP上限に達した現在列の選択表示、320px/200%/RTLのcard配置。DiagramのラベルTab確定、空座標のエラー、修正・自動配置。Chat pending反復、失敗時draft保持、再送成功後draft clear。Chat外部focusの保証は上記制限に留めた。
- **Media**: native Enterで音声再生、1.5倍指定と停止後の速度保持、dense320px/200%/RTL表示。画像取得失敗→source復旧の両状態で外部操作buttonのfocus保持。空動画sourceのerror/retryは成功と表示されないことを確認した。

## 非blockingの観察と確認限界

重要な条件の未解消不具合はない。次は観察した制限であり、指定されていない契約を不具合として確定していない。

1. **I1 / severity: informational** — `/catalog`の閉じたselectでは長い選択文言がclipする。triggerはguided320px/100%のprofile、guided320px/200%のprofile/date-format/grid-columns、dense320px/200%のprofile（LTR/RTL共通）。例えばguidedのprofileは文字line-box162pxに対してcanvasで推定した全ラベル幅365.65px。impactは現在値の文言全体を閉じた状態で読めないこと。valueと選択optionの全文はDOMに残り、矢印端余白・文字領域とのclearanceは保たれる。locationは `tests/fixture-app/catalog.ts` の `catalog-profile`、`date-format`、`grid-columns` と共通 `templates/angular/styles.css` の `.ui-select-control`。evidenceは `select-matrix.json` と代表select PNG。native popupでの全文可読性は未確認であり、常時全文表示を要件に採るなら別途判断・確認が必要。
2. **I2 / severity: informational** — 320px/200%では表の一つの列がローカルviewportより広くなり、隣接列や長い値・説明の全体を見るには横scrollが必要。triggerは文字拡大と列の最小幅。impactは初期表示に全列・全説明が同時には出ないこと。locationは `templates/angular/data-grid.ts` と `templates/angular/data-table-view.ts` のlocal table viewport。evidenceは `local-horizontal-scroll.json`、`table-matrix.json`、`native-table-matrix.json`。表仕様が許すローカルscrollを実操作で確認しており、ページ全体のoverflowや状態変化時の列移動は観察しない。

実操作の値・focusはDOM snapshotでも記録したが、それだけで視覚合格とはしていない。代表PNGで配置と階層を直接確認した。native selectの全option popup、読上げ結果、全rendererのgeometry、実バックエンド応答・本番データの操作は確認していない。Palette/Chatで無効化される応答buttonのfocusは保持合格に混ぜない。

中断前後の観測を保持した。旧コンソール接続・ブラウザ終了、初回のhidden-host待ち、Chat locator重複はドライバー側の問題として修正・再実行した。`specialist-interactions-initial.json` と `filter-invalid-input-observations.json` は初回/無効入力の生記録であり、有効save・Kanban移動の合格根拠には使わない。後者の便宜的step名「pending」「failure」も実状態の合格を意味しない。有効値での確定済み記録は `filter-interactions.json` と `specialist-interactions.json`。

## 保存すべき証拠

以下はすべて `/tmp/ui-foundation-ui-review-20261009/` にある。代表PNGは6枚を推奨する。

| PNG | 示す内容 |
| --- | --- |
| `select-profile-guided-320-200-rtl.png` | 拡大/狭幅/RTLの矢印端余白と長文clip |
| `select-profile-dense-320-200-ltr.png` | denseの端余白と文字領域 |
| `native-table-cell-idle-desktop-actual.png` | quiet editのidle階層、leaf header/cell整列 |
| `native-table-cell-focus-desktop.png` | 同じ予約幅とkeyboard-visible focus |
| `table-edit-failure-desktop.png` | 編集draftと失敗時の復旧説明、補助列配置 |
| `spreadsheet-worker-recovery-desktop.png` | 入力保持から実計算への復旧と外部focus |

実測・操作の正本として `select-matrix.json`, `table-matrix.json`, `native-table-matrix.json`, `table-interactions.json`, `native-table-cell-cancel.json`, `supplemental-table-keyboard.json`, `local-horizontal-scroll.json`, `filter-interactions.json`, `palette-interactions.json`, `form-dialog-interactions.json`, `spreadsheet-interactions.json`, `specialist-interactions.json`, `media-interactions.json` を推奨する。scope根拠として `catalog-route-observations.json`, `specialist-observations.json`、対応監査として `final-identity-check.json` と固定入力manifestのraw copyを残す。採取スクリプトも同ディレクトリにある。

このレポートと機械可読 `review-report.json` が判定の正本。全aggregateの結果、および証拠文書を追加したexact final headへの対応は親担当の後続監査に引き継ぐ。
