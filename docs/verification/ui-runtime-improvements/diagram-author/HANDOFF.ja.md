# Diagram 2 P2 修正候補

作者候補は実装と対象検証を完了し、作者外の独立レビューへ提出できます。共有リポジトリ、Git、親の生成物は変更していません。作者の検証は独立承認・統合後の全検査を代替しません。

基準 commit は `9f5430ca87e249af204cc335a8610d0d8040621f`。`source-delta.json` に 8 ファイルの before/after SHA と、source tree SHA `fb23199162fea3dd15b15ec97bb92aa36fa06f0fb1d6cd21d06cf6309d4b883a` を記録しました。

| 差分 | 内容 |
| --- | --- |
| `templates/angular/diagram.ts` | 確定前検証、値と入力の保持、理由と ARIA、外部値変更時の古い検証解除、境界内のキーボード移動 |
| `templates/angular/specialist-model.ts` | 空白ラベルと負座標のモデル・編集結果検証 |
| `skills/ui-development/references/ui-library-runtime.md` | 利用アプリと部品の契約を同期 |
| `tests/fixture-app/main.ts` | 新 consumer の import と `/catalog/diagram-validation` 分岐 |
| `tests/fixture-app/diagram-validation-catalog.ts` | 公開 barrel だけを使う controlled consumer と locale/profile/外部更新の操作 |
| `tests/model/diagram-validation.test.ts` | 境界・原文・不変性の 6 試験 |
| `tests/ui/diagram-validation.spec.ts` | 元の専門カタログで 2 P2 の 8 回帰操作 |
| `tests/ui/diagram-controlled-validation.spec.ts` | 外部更新・保持・辞書・制限・連打・狭幅の 12 操作 |

`patches/` に製品・Skill・fixture・試験の分割差分と一括差分を用意しました。既存ファイルの before SHA を照合して採用してください。他作者が `main.ts` を変更した場合は import と route の最小 hunk を取り込み、全体を置換しないでください。Skill 参照にも別作者の追記がある場合は同様に追加段落を統合してください。新規ファイルは上書き前に未存在を確認してください。

生成物は提出パックに含めていません。親の正規 `npm run ui:sync` → `npm run ui:check` → strict/AOT/build を使用してください。局所の browser 用 `evidence/harness/diagram-validation.config.ts` は作者の own port と全 trace 用で、採用対象ではありません。通常の `playwright.config.ts` の起動経路で正式試験を実施できます。

| 検証 | 実結果 |
| --- | --- |
| 修正前の 6 モデル試験 | 3 pass / 3 fail、actual exit 1 |
| 修正前の 8 回帰操作 | 0 pass / 8 fail、actual exit 1 |
| 修正後の関連モデル | 19/19 pass、actual exit 0 |
| canonical dry-run / sync / check / 全139 strict AOT / build | actual exit 0 |
| 新 UI spec 2 本と関連 helper の strict TS | actual exit 0 |
| 最終 native Chromium、guided/dense | 22/22 pass、retries 0、2 workers、actual exit 0 |
| 最終 sync/check の冪等性 | 151 生成ファイル、変更なし、actual exit 0 |

初回の新 consumer は selector 不一致で NG05104 により入口で停止しました（10 pass / 12 fail）。その後の 2 実行は、描画・親モデルの実更新前に scalar を読む試験により各 20 pass / 2 fail でした。各 actual exit 1・trace・元 spec を `evidence/diagnostics/` に保持しました。修正したのは fixture selector と実モデル/キャンバス/入力の更新を待つ試験です。境界、件数、原文、フォーカスの期待値と製品 2 SHA は維持しました。dense X の旧 trace 末尾では正方向の更新を未観測と記録し、合格へ読み替えていません。最終 22 件は新しい実行結果です。

axe は、320px・ルート文字サイズ200%・RTL・reduced-motion の各 profile で main を検査し、違反 0 件でした。SVG の接続ラベル `確認` の背景重なりを理由とする `color-contrast` 未判定が各 1 件あります。元 JSON、写真、対象 DOM を保持しました。スクリーンショットでは理由が折返して表示され、入力のフォーカス枠と元の承認ノードを確認しました。横方向に全内容が同時には収まらない写真であり、全ピクセルの非切欠けやこの未判定項目の合格を主張しません。ネイティブ ARIA snapshot、実入力の hit-test、キーボード操作は該当試験で確認しています。実スクリーンリーダー、タッチ端末、全ブラウザ、全181部品の再検査はこのパックの範囲外です。

own server は作業ディレクトリと PID を照合して終了しました。localhost preflight で旧 server 不在を検出した 1 回は試験を開始せず、復旧した own port 52053 の実行を記録しています。残る gate は作者外レビューと親による他差分を含む最終統合・全検査です。
