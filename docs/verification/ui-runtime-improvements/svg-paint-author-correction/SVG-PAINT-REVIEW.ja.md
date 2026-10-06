# Gauge SVG paint と補助コントラスト検証

本本文は、`../svg-paint-author/SVG-PAINT-REVIEW.ja.md` を置き換える訂正文である。証拠・candidate・driver の相対パスは、元の immutable `../svg-paint-author/` を基準に読む。元539ファイルのすべてを再照合し、変更0を確認した。元の全11 tick保持は満たされており、axe node数の差を過去のtick欠落の根拠にしない。訂正以外に source・試験・結果の変更はない。

元 source の Arabic tick に後続目盛り線が重なる欠陥を再現し、`chart-options.ts` の寸法計算だけを修正した候補を用意した。最終候補の生成済み公開 API を使う production consumer は、34 条件すべて実終了 0。候補作者は本報告者であり、修正候補の独立承認は作者外 critic に委ねる。元の 181 項目完了・既存 a808 consumer APPROVE は変更しない。

## 対象 source と入口

- baseline commit: `9f5430ca87e249af204cc335a8610d0d8040621f`。
- 元 `chart-options.ts`: `0f67298310c65341c9db2886cf43ab8bd7d399f9aec7a885706db30dd7a7bd2b`。
- 最終候補: `857eab2fba50efe028140d1907e048f0b29762c97feafbe064c9f6798a461d1b`。
- 採用する raw source: `proposals/v2/templates/angular/chart-options.ts`。モデル回帰: `proposals/v2/tests/model/specialist-chart-options.test.ts`。
- 永久回帰の入口: `proposals/permanent/scripts/test-svg-paint.mjs`。`proposals/permanent/tests/consumer-svg-paint/` の 6 ファイルを同じ相対パスで採用する。
- 全 SHA/bytes、source 差分、未変更 source/config/依存の対応は `FINAL-SOURCE-FREEZE.json`、`CANDIDATE-MANIFEST.json`、`diffs/`。成果全体は `DELIVERY-MANIFEST.json` の `.files` で照合できる。

共有 repository、Git、他のサーバー・ブラウザーは変更していない。raw template → canonical CLI → fresh generated consumer の順で実行した。生成物の手編集はない。

## 元の pixel 差の原因

元の厳格条件を同じ native SVG 寸法・変換・computed font で再現した。guided は solid glyph 8893 ピクセル中 71、dense は 6766 中 55 の差で実終了 1。`evidence/before-strict-paint.*` は失敗記録のまま保持する。

独立の診断コピーで stroke 全体を除くと両方 0。後描画 stroke を一つずつ除いた対照では、guided の 15 path、dense の 14 path が差をすべて説明した。`evidence/paint-classification.*` に各 label・該当 path・native 座標・before/除去後 RGBA を保存した。ECharts 6.1.0 の実装は major splitLine → label → minor axisTick の順で描く。元の centered label の外側が、後から描かれる minor tick に達していた。元の 71/55 は font の差や通常の anti-alias 差として除外していない。

候補は rotated text の native canvas 計測から最大対角線を計算し、label の半寸法と semantic gap を major/minor stroke の内側に予約する。同じ予約寸法を dial 半径・label distance に反映する。全 11 tick、精度、元の値・ID・selection は保持する。

v1 (`21f8de0c...`) は元の narrow 2 条件を 0 にしたが、wide の長くなった vendor pointer が label に達した。全 32 条件の実終了 1 を `evidence/v1/` に保持し、最終候補として採用しない。v2 は needle の長さを既存 60% 上限と label 内側の安全寸法の小さい方に制限する。`showAbove:false` のみで重なりを隠していない。

元モデルの `normal.columns===3` は responsive 列数を固定した assertion だった。寸法予約が増える条件は 2 列・2 行になる。列数・行数の期待をその実寸法に合わせ、title/detail 分離・各 dial の境界・最終行の高さ・missing 値・selection の assertion は保持した。追加の geometry 回帰は major/minor tick と pointer の両方が label の半対角線 + semantic gap を侵さないことを確認する。モデル計 9/9 は実終了 0。

## 最終の永久回帰

`UI_SVG_EVIDENCE=<出力先> node scripts/test-svg-paint.mjs` が入口。任意の source repository を第 1 引数で指定できる。fresh な専用一時ディレクトリに raw source/config/Skill/package を byte 一致でコピーし、exact installed dependency 46 個を照合する。fresh sync/check/再 sync/dry-run、150 owned output と manifest の不変、公開 barrel だけの consumer AOT、production bundle、専用 ephemeral localhost listener、actual Chromium を同一 lifecycle で実行し、finally で自身の listener を閉じる。root に組み込む場合は `test:svg-paint` をこの command にし、既存 `npm test` の全検査を保持して追加する。

`tsconfig.consumer.json` の include は `consumer.ts` だけ。fixture は公開 barrel の named API を使い、全 generated TS glob を compile 成功のために追加していない。consumer AOT、別の全 139 product TS strict AOT、実 ECharts の production build はそれぞれ実終了 0。生成・依存・assets の契約を変更していない。consumer の bundle 出力は 74 個で、公開・配布は実行していない。

34 条件は guided/dense × 1280px/320px × LTR/RTL × Arabic 2 桁/Japanese 9 桁/German 2 桁/zero + large + null の 32 条件、さらに narrow RTL の 0..1 fractional scale 2 条件。narrow は root font 200%。実際の表示値と全 tick は consumer 側の独立 `Intl.NumberFormat` で期待し、zero の値表示と zero tick の同一文字列も独立に数える。

最終 fresh 実測: `evidence/permanent-full34/` と `evidence/permanent-full34.log/.exit`。

| 検査 | 実結果 |
|---|---:|
| canonical sync/check/idempotent/dry-run/public AOT-build/native | 6 step 全 actual 0 |
| native 条件 | 34/34、runtime error 0 |
| actual SVG text labels / alpha>0 ink | 1226 / 573046 pixels |
| alpha>0 exact RGBA 差 / 元 strict 差 | 0 / 0 |
| expanded reference alpha 差 / clipped ink | 0 / 0 |
| glyph ink の相互交差 | 0 |
| font bounding box の交差 | 52（ink 交差と区別） |
| opaque 背景と全 glyph の最小 contrast | 14.645016318974449 |
| native pointer 選択 / table Enter 選択 | 94 / 34 |
| locale/profile/direction 後の入力 DOM・draft・raw value・selection 保持 | 34/34 |
| fresh source 不変 / own listener 閉鎖 | 確認済み / 確認済み |

named local LTR scroll region の native ArrowRight、typed table の application RTL、disabled/busy の操作制限、long original label と null の table 保持も含む。34 SVG と 34 PNG、各 text の native visibility/opacity/scroll 後到達確認、8 edge 条件の ariaSnapshot を保存する。AI が実画像 guided narrow RTL Arabic と dense wide LTR Arabic を確認したが、人の目視を完了条件に使わない。

## 独立 paint/clip/contrast reference の範囲

native SVG root・transform・computed font/fill/baseline/direction を非同期 raster 前に固定する。actual native SVG 全描画と、同じ root/transform で text 一つだけ + actual opaque background を残した独立 reference を real Chromium Image/Canvas で描く。glyph alpha が 0 より大きいすべての pixel で RGBA を完全一致比較する。許容 delta は 0。従来の alpha>=250/delta>24 指標も別に 0 を要求する。

clip reference は root の原点と座標を移動せず、右・下の viewport だけを拡張する。元平面の alpha 完全一致と、元の右・下の外に出る ink 0 を確認する。左・上は native の unclipped `getBBox` を root に投影し、1px 以上の AA 余白を要求する。各祖先の clip-path/filter/mask がないことも確認する。これは同一 native origin の exact plane と境界検査であり、4 方向へ原点を移した raster と同じ保証だとは書かない。

初期の 4 方向 expansion は padding 242 の原点移動だけで Japanese “80” の alpha に 178 pixel 差を作った。viewBox、nested viewport、translated group の 3 対照で同じ差、padding 64/100/128 では 0、同じ 242 でも原点保持の拡張では 0。`evidence/expanded-plane-classification.*` に保存した。native original plane の製品 paint は同じ条件でも差 0 だった。これは実験で確かめた reference 原点と raster の依存であり、Skia 内部の原因を断定しない。元の製品 stroke overlap の修正と参照測定の修正を別履歴にした。

contrast は glyph AA shade と白の比を測らず、実 computed foreground と、text だけを除いた actual full drawing の各 glyph pixel 背景を使う。背景の alpha 255、ratio>=4.5 を丸めず要求する。測定した 2 profile の semantic foreground/background が対象。任意の app theme・すべての browser/OS/font・法的適合・人の意味理解を保証しない。[WCAG Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[relative luminance](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance) に基づく。

診断コピーの負対照 `harness/verify-audit-controls.mjs` は実終了 0。未変形 baseline 0、後描画 white overlay は 106 mismatch、white-on-white は ratio 1、右端 clip は 78 ink、必須 tick 除去は 3→2 と検出した。負対照を製品の成功条件として数えていない。

## axe の incomplete は保持

元の SVG 196 incomplete は imgNode 160 / bgOverlap 36。元 raw source SHA と scope 別 node 数は `evidence/historical-svg-196-incomplete.json`。最新 edge 8 scope の axe は violations 0、SVG contrast incomplete **212** (imgNode 176 / bgOverlap 36)。wide 26×4 + narrow 27×4。新しい geometry と large 値の実折返しにより、axe 対象 node の集合・座標は元 196 と異なる。node 数の増加を、元の glyph や tick の欠落の証拠とはしない。元の全 11 tick 保持の実測も別 scope のまま保持する。

axe 4.13 の `elementHasImage` は SVG を graphic node として背景判定を imgNode にする。bgOverlap は重なる DOM element から背景を確定できない分岐である。raw incomplete は未判定のまま保存し、rule を off にせず、成功へ書き換えない。全 glyph の direct contrast/paint/clip、native typed table/keyboard/ARIA の補助実測を別 scope として報告する。全 axe incomplete 解消という承認ではない。

## 失敗履歴・実行環境

原 baseline 71/55 実1、v1 pointer 実1、元固定 3 列モデル実1、初期原点移動 reference/不正 fractional fixture 実1、初期 required input/selector/race/404 harness 実1 を削除せず保持する。旧 persistent own 5344 listener の消失後、別実行は全 34 ECONNREFUSED 実1。これを source 失敗や 34 の実測 PASS に変換しない。最終は同一 lifecycle の fresh ephemeral runner を使用した。own listener 12072/port60725 は終了し、他サーバーの停止・一括 process kill はしていない。

追加負対照の初回 browser command は自動承認レビューの capacity failure で**未実行**。親が指定した同一引数・同じ承認経路の 1 回再試行は承認され、診断実終了 0。first failure と retry は `evidence/approval-review-history.json`。承認経路の迂回はない。

候補 source は作者外 critic の独立 review が必要。本報告は実測と採用可能な candidate/回帰/proof を渡すもので、全 catalog の再承認、root の full npm、browser matrix の別担当結果を代行しない。
