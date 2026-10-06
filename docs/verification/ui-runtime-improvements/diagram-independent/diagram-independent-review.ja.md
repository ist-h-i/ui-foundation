Diagram P2 候補の独立判定は **approve**。空・空白だけのノード名と負座標の拒否、妥当な文字列・小数・境界値の保持、編集欄の復旧を、確定した 8 files に対して確認した。検証対象の blocking finding はない。

作者は `/root/review_specialist_candidate`、批評担当は `/root/prepare_responsive_gauge`。批評担当が別作業で作成した Media strict 候補の承認は含めていない。共有 workspace、Git、他 actor の stage／port は変更していない。

基準 commit は `9f5430ca87e249af204cc335a8610d0d8040621f`。Git archive で取得した raw files に作者の 8 files だけを適用し、別の public-barrel consumer と検証設定を own stage に追加した。生成物は正規 `npm run ui:sync` で作成し、手編集していない。8 files の最終 byte は作者の portable `source-delta.json` と全件一致した。source tree SHA256 は `fb23199162fea3dd15b15ec97bb92aa36fa06f0fb1d6cd21d06cf6309d4b883a`。

| 確定した製品 source | SHA256 |
| --- | --- |
| `templates/angular/diagram.ts` | `914840dc04ef11bec4071d02a511917fc5e859a7dbb044063d8cb66a823c2817` |
| `templates/angular/specialist-model.ts` | `89d2a2d8c30063c67520ac9b4e3eae847794aab38985a3f1d898eb2e3393bccd` |

`docs/ui-library-request.ja.md:236` と matrix `specialist-12` の「ノード、接続、配置、拡大、編集」へ対応付けた。既存の実 Dagre 配置、ノード追加、接続、矢印移動、拡大は既存正式ケースをそのまま独立再実行した。候補は公開名・output・model 型を維持する。色・寸法・gap の計算は既存の用途別 semantic に接続したまま。

| 確認点 | 実装の判定根拠と実測 |
| --- | --- |
| model の拒否境界 | `diagramProblem` が文字列の型／空白と有限の 0〜1000000 を検査し、`changeDiagram` の入力・結果双方で検査する。純モデルは空白・負値・非有限・上限超過の拒否と入力不変を検証。 |
| 原情報の保持 | valid label を trim せず publish。0、0.125、分数、1000000 を保持。不正 draft では app model と named canvas node、selection を変えず、修正後だけ app-owned `changeDiagram` へ接続する。 |
| field ARIA | rejected field の `aria-invalid` と固有 alert id への `aria-describedby` を確認。二つの FlowEditor を同時に配置して参照先が混ざらず、一方の修正で他方の error が消えないことを検証。 |
| 外部 app 更新 | 他の field の更新では rejected draft を保ち、対象 field の新値では stale validation を除く。ノード除去→app reset、外部の不正 model→app 修復を実行。 |
| live text と入力 DOM | library-owned validation だけを辞書で翻訳。アプリ文字列「提出 α」や valid label の前後空白は保持。locale／profile の切替後も同じ native input、selectionStart、focus と raw draft を保持。 |
| 状態と keyboard | readonly／busy／disabled で編集を抑止し、復帰後も draft を保持。native ArrowLeft／Up と Right／Down、Shift、0 と 1000000 の境界停止をモデルの実反映と照合。 |
| narrow／RTL | guided／dense の 320px、200%、RTL、reduced motion で invalid editor の focus、実 hit-test、AX を取得。named local regions は tabindex 0。ページ幅は両 profile とも clientWidth=scrollWidth=320。全文の node／connection データは表と native list に残る。 |

批評担当の実終了は以下。作者の実行結果をこの件数へ加算していない。

| own command | 結果・範囲 |
| --- | --- |
| `npm run ui:sync` / `npm run ui:check` | 各 actual exit 0 |
| `npm run typecheck` | actual exit 0。基準版 tools／model TypeScript と生成 Angular 139 source、fixture-app、別 public-barrel consumer の strict AOT。 |
| `tsc -p tsconfig.diagram-review-tests.json` | actual exit 0。新しい正式 Diagram 2 specs、批評担当 spec、および直接 import の TypeScript。全 UI strict の成功とは扱わない。 |
| `tsx --test tests/model/specialist-model.test.ts tests/model/diagram-validation.test.ts` | 19/19、fail／skip 0、actual exit 0 |
| own Playwright、port 5484 | 26/26、actual exit 0。既存正式 2 + 拒否 8 + controlled 12 + 独立 consumer 4。1 worker、0 retries、skipped／flaky／unexpected 0。134.301 秒、開始 `2026-10-06T12:56:53.345Z`。 |

実行時の raw input vector 313 files と template 139 source の変更は 0。own server の自動終了後、5484 に LISTEN がないことを read-only で確認した。

axe の対象 4 scans は violations 0、各 scan に `color-contrast` incomplete 1。対象は SVG 接続ラベル「確認」の背景重なりで、支援技術用の全文は native 接続リストにも存在する。incomplete は未確定のまま保持し、全 axe 合格や WCAG 全体の認証へ読み替えていない。narrow PNG 4枚、AX、geometry、hit-test、axe の全 raw JSON を保存し、批評担当は guided の正式画像と dense の独立 consumer 画像を実際に確認した。人による目視チェックを完了条件には加えていない。

作者の旧 model 3 FAIL／native 8 FAIL と selector・描画反映 guard 修正の途中失敗は作者 portable pack の歴史証拠であり、この独立実行とは分ける。最終 2 UI specs は `059b8922b053ba2b0a516223f8a606b5092cd17f7063daf7774ec97a2997c777` と `8b2039f582e71fa62b61a4e3094001fc532d048de054f0a444281f1c4f29b7b2` を実行した。

再現には own `evidence/candidate-source/` の exact bytes、`evidence/reviewer-fixture/` の追加 consumer／main／Playwright／tsconfig／spec を使用する。`source-manifest.json`、`evidence/final-portable-author-match.json`、`evidence/command-exits.json`、`evidence/native-results.json`、`evidence/native-summary.json`、`evidence/post-run-input-guard.json` が採否を支える。新 branch 全体の immutable 回帰、PR、merge の最終判定は親担当へ引き継ぐ。
