# 独立コードレビュー（初期の作業ツリー）

Decision: **request changes**

対象は `feat/component-ui-ux-review` の未コミット変更。比較基準と確認時の HEAD は `eeae8a9952489dc406fb70a478e25974ca695017`。正確な PR head の最終承認ではなく、修正前の作業ツリーに対する独立した初期レビューです。過去レビューの合否や過去の成功ログを判断の前提にしていません。

## Findings

- **[P1] templates/angular/data-table-view.ts:205 — 背景用の action 色を透明背景の文字へ流用し、受理済みの明るい action 設定で編集・並べ替え操作が読めなくなる。**
  - 関連箇所: `templates/angular/data-table-view.ts:209`、`templates/angular/table-editors.ts:13`。
  - 再現条件: `tests/config/config.test.ts:320–338` が明示的に受理する `color.action=white`、`color.action-hover=white`、`color.on-action=ink` の設定を用いる。既定の `color.surface=white` と合わせて、DataTableView の「行を編集」、CellEditor/RowEditor の「編集」、hover 中の並べ替え見出しを表示する。
  - 根拠: 新しい CSS は編集開始ボタンの背景と枠を透明にしながら文字を `--ui-color-action` に変える。並べ替え hover も surface 背景と action 文字を組み合わせる。この受理済み設定では白地に白文字、比率 1:1 になる。従来の secondary 操作は text/surface の組で表示される。`docs/design.md:45` は action/action-hover を主操作の背景、on-action をその文字として定義し、独立した foreground の役割を指定する。`src/roles.ts:41–51` は action と surface/background の組を保証しない。
  - 必要修正: この三か所の foreground を、使用背景とのコントラストを保証する `color.text` または適切な foreground の意味役割へ変更する。テンプレートから同期し、明るい action 背景を実際の table/editor と sort hover に適用する回帰試験を追加する。既定の guided/dense 配色だけの試験では再発を検出できない。

- **[P1] templates/angular/diagram.ts:17 — 接続選択時の stroke/fill も背景用 action 色へ変わり、同じ設定で選択した接続線と矢印が消える。**
  - 再現条件: 上記の明るい action 設定で FlowEditor の接続選択ボタンを押す。canvas の背景は `color.surface=white`。
  - 根拠: 新しい `.ui-diagram-edge[data-selected=true]` と `.ui-diagram-arrow[data-selected=true]` はそれぞれ stroke と fill を `color.action` にする。通常の接続は border 色で見えるが、選択状態では白に置換され、白い canvas 上で 1:1 になる。従来は通常の線色を維持し、選択を線幅で示していた。今回は選択した接続の可視性を失う回帰になる。文字色の問題と原因は共通だが、別部品の変更なので修正漏れを避けるため独立に記載した。
  - 必要修正: 選択した線・矢印の foreground に、その surface 上で見える適切な意味役割を使う。独立した役割を追加する場合は設定契約と必要な検証組を揃える。明るい action 設定で通常・選択状態の接続が読め、選択を認識できることを確認する。

P0 は直接の根拠を確認していません。上記以外の P1/P2 は今回確認した範囲では確定していません。ソースの修正は主担当へ委ねています。

## Suggestions

- `tests/model/specialist-model.test.ts:9` の新しい `diagramConnection` 試験はテンプレートの正本を直接 import しています。同じファイルの他のモデル試験と揃え、生成された `diagram-layout.ts` を参照すると、consumer が実際に受け取るものを単体試験の対象としても明確にできます。現状でも生成一致検査と UI 試験の経路があるため、これをマージ阻害所見にはしていません。

## Evidence reviewed

- `AGENTS.md`、`docs/project-brief.ja.md`、`docs/design.md`、`docs/implementation-plan.md`、`docs/development.md`。
- `code-review-quality` skill、`skills/ui-development/SKILL.md`、生成された `.agents/skills/project-ui/project-context.md` の文脈・設定説明、設定正本 `examples/ui.config.example.yaml`。
- 変更された `templates/angular/` の全 37 ファイルの diff。圧縮された CSS/template は改行を入れた比較でも確認し、非同期 focus 復旧、所有する focus の識別、破棄時の後処理、controlled model の保持、方向・profile・文字拡大への追随を中心に周辺実装と照合した。
- 変更された fixture、モデル試験、生成 consumer 試験、UI 試験、`tsconfig.ui-runtime.json`。未追跡の `tests/ui/` 19 ファイルと `tests/fixture-app/catalog.css` も直接読んだ。
- Calendar の日付 focus/表示、FormDialog の保存失敗復旧、ConfirmPopover の同一 turn の終了抑止、Palette の長いエラー/再試行、Kanban の現在列/移動後 focus、FlowEditor の接続端/自己接続/削除後 focus、Gantt の軸/文字幅、仮想 Listbox の拡大、Spreadsheet の固定範囲と native セル移動、FilterBuilder/Chat/Media の非同期処理と外部 focus 保持の実装および試験内容。
- `src/sync.ts` の生成所有範囲、`src/roles.ts` の色ペア契約、既存の明るい action 設定の受理試験。テンプレートと生成 Angular ファイル、および Skill 正本と生成 Skill の byte 比較は一致した。manifest に列挙された 151 ファイルの SHA-256 を読み取りで照合し、欠落・不一致はなかった。README の除外は `src/sync.ts` の意図した対象範囲に従った。
- 変更された文書・Skill の記述では、保存・送信・Undo・controlled model 適用は利用アプリが所有する契約を維持している。実操作と静的な一致検査、アクセシビリティ検査、意味/視覚評価の区別も維持されている。

## Residual risk / 確認限界

- この担当は read-only の独立レビューとして作業した。コード修正、git mutation、build、sync、UI/モデル試験の実行、外部サービスへの送信は行っていない。生成一致は上記の読み取り比較によるもので、`npm run ui:check` 実行の代替として報告していない。
- 試験コードが対象操作を検証していることは確認したが、今回の試験実行結果はこの担当からは合格と認定していない。とくにフォーカス、SVG/text の実際の画素、native media、worker、strict consumer の実行結果は主担当の fresh な実行証拠を確認する必要がある。
- `output/`、`evidence/`、`docs/verification/` の巨大な過去ログ、無関係の個人ファイル、認証情報、他プロジェクトは読み込んでいない。
- 未コミット状態のレビューなので、その後の修正・生成・commit を含む PR head に対して再確認が必要。初期所見二件を修正し、該当する明るい設定の回帰検証と必要な既存検証を完了するまでマージを推奨しない。
