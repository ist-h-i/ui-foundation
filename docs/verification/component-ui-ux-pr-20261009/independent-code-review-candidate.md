# 独立コードレビュー（最終コード候補）

Decision: **approve — コード候補**

対象は base `eeae8a9952489dc406fb70a478e25974ca695017` → candidate `08d524e13975ba279ca9db9c39330a371eae527c` の全差分。マージ前の全試験完了確認とは区別する。この時点では修正後の完全な `npm test` が実行中であり、最終検証記録を追加した正確な PR head とその入力一致を最後に確認する必要がある。

## Findings

- **未解消の P0/P1/P2: なし。**
- 初期 P1 二件は解消した。`templates/angular/data-table-view.ts:205` と同 `:209`、`templates/angular/table-editors.ts:13` の編集・並べ替え foreground、および `templates/angular/diagram.ts:17` の選択した接続線・矢印は `color.text` を使う。明るい action 背景が妥当な設定として許される契約を維持し、その surface/background 上の foreground を保証済みの組へ変更している。
- `tests/ui/async-retry-focus.spec.ts:205–208` の同期修正は妥当。復元済みモデルと native editor 値を確認した後に baseline を取得する。保存後の比較、失敗、再試行、二重要求、入力 DOM の同一性、外部 focus/scroll、外部 reset、disabled、破棄と stale-result ownership の assertion を削除・緩和していない。
- `tsconfig.ui-runtime.json:5` の extension import 許容は noEmit の試験用プロジェクトに限定され、strict 検査の無効化や製品側 emit 設定の変更を含まない。

## 全差分・契約・生成範囲

- 全差分は162ファイル。前段の独立レビューで37テンプレート、fixture、既存試験変更、追加19 UI 試験、Skill・文書を直接読んだ。同じ連続レビューとして、現在の候補まで各差分を照合し、P1 修正二件、追加した明るい設定試験、型設定、条件保存試験の同期修正、今回の検証記録を再点検した。
- `a6bd7b5` → 今回の candidate では、コード側の変更は既に独立確認した条件保存試験の同期追加だけ。製品テンプレート、生成 runtime、fixture、設定契約への追加変更はない。active source の作業ツリーは candidate HEAD と一致している。
- `src/`、設定正本 `examples/`、依存宣言/lock、`AGENTS.md`、project brief、design、implementation plan、development の基底契約は base から変更していない。旧 preset/density/API の互換層や自然言語からの設定推定を追加していない。
- テンプレート・部品・fixture の追加表示は用途別の semantic を参照する。カタログのデータ座標・計算寸法・SVG path と UI の意味色/寸法を分けている。native 操作、controlled model、保存/送信/Undo と実 I/O の利用アプリ責任、失敗/欠損/結果不明の意味と復旧経路を保つ。
- テンプレートと生成 Angular ファイル、Skill 正本と生成 Skill は byte 一致。生成 manifest の151ファイルについて SHA-256 に欠落・不一致はない。所有範囲の生成ファイルと Skill を超える生成変更はない。`git diff --check base candidate` も成功した。この読み取り比較を CLI の ui:check 実行結果とは混同していない。
- API/Skill の追加記述を実装と照合した。狭幅・文字拡大・RTL、局所 scroll、focus 保持/復帰、Calendar、Palette、Dialog、Filter、Kanban、Gantt、Spreadsheet、FlowEditor、Media の表示と操作契約に整合する。全ソース AST 検査や、数値コントラスト検査だけで UX 全体が合格したという主張は追加していない。

## 試験・記録の正確さ

- 明るい action 背景の追加試験は parse/resolve/renderTokens を通る設定を実ブラウザーへ適用する。既定の guided/dense だけで問題を隠す試験になっていない。保存された修正前の失敗・中間候補の失敗・修正後4件成功の元 JSON を確認済み。
- `condition-sync-green.json` を解析した。guided/dense 各12件、全24件が expected/passed、skipped/unexpected/flaky 0、各 retry 0、各 errors 空、全体 errors 空。設定も repeatEach=12、retries=0 であり、同じ complete recovery 試験を繰り返している。実行コマンドと exit0 は同期検証文書に記載されている。この担当が再実行したものではない。
- 中断した候補のログには config 70/70、generation 23/23、model 193/193 と、guided の条件保存 UI 試験の実際の一件の失敗が残る。中断記録は aggregate を exit -15 とし、未実行部分を合格にしていない。import 型検査の失敗とその後の修正も、別の実行記録として保持している。
- 条件保存失敗の raw trace SHA-256 は `condition-sync-trace-selection.json` と一致し、抜粋8イベントも raw trace に存在した。24回の補助観測は19回の初回 stale read と、描画確認後の全24回のモデル保持を記録する。補助観測を後続の complete recovery assertion の代用としていないことが文書に明記されている。
- `a6bd7b5-source-manifest.json` の480ファイルを当該 commit の Git object と照合し、missing/mismatch は0。現在の candidate と異なる active source は同期修正した UI 試験一つであり、旧 snapshot を現在の全入力として扱っていない。
- frozen UI review の480 source は現在の candidate と `tsconfig.ui-runtime.json`、同期修正した UI 試験の二つだけが異なる。309 runtime ファイルは現在の build と一致した。これは frozen UI review の runtime 同等性を示すが、現在の全試験完了や最終 head の一致の代替にはしていない。

## Suggestions

- `tests/model/specialist-model.test.ts:9` の `diagramConnection` import を生成ファイル側へ揃える任意提案は残る。生成一致と consumer/UI 試験の経路があるため、必要修正・マージ阻害所見としていない。

## 試験完了待ちの条件と確認限界

- この担当は編集、git mutation、build、sync、試験実行、外部送信を行っていない。ソースと保存済み証拠を独立に確認した。全 aggregate、verification-tools、独立 UI レビューの完了結果はまだこの candidate の最終結果として確認していない。
- 完全な検証を終えたら、実行前後の active source 入力の一致、終了コード、fail/skip/flaky/retry、実行対象、既存の失敗/中断の扱いを確認する。証拠文書だけを追加した最終 head では、candidate から製品・設定・試験の入力が変わっていないことも確認する。
- Firefox/WebKit、実機/スクリーンリーダー、実業務 backend の保存・送信・Undo は今回の検証済み範囲に含めない。過去の巨大な画像・候補ログを今回の結果へ代用していない。
