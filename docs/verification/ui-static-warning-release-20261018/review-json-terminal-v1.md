# JsonViewer End終端待機の独立レビュー

判定: **approve（固定したテスト・台帳差分に限定）**。Blocker / Major / Minorの指摘なし。修正は、native Endが動き始めた時点で測定準備のscroll書込みを重ねていた競合を避ける手順として妥当です。通常検証の成功や取り込み可否全体は、この判定に含めません。

## 固定対象

- branch: `feat/ui-static-warning-release`
- base / HEAD: `88a72c2a94f6649a935d764166d83fe6d45b2758`
- overall base: `b4aea63f67447dda1cabcf2da749617aa39c2d6f`
- 未コミット対象: `tests/ui/static-runtime-reassessment-layout.spec.ts` / `docs/ui-warning-reviews.json`
- snapshot SHA256: `459a2357bd35f69e16cfada04fc66bf2c3ef0c24e873f90badf978b3918806ff`
- patch SHA256: `086cc6dd888c7580c29816d2e2b694329edee3e9d9ed1bd7c8f16724f0039260`
- tar SHA256: `f46c5154ebbaeee81171ae458978320aa3b785c971c4b07736c79813fa1b5282`

16入力の現物hashを開始・終了時に照合し、全件一致。tar内の同じ16入力も一致し、現在の2ファイル限定diffは固定patchとbytes単位で一致しました。

## 修正の評価

`tests/ui/static-runtime-reassessment-layout.spec.ts:216-220`は、従来のnative Tab focus・focus ring・End・正のoffset確認を保ち、その後、`abs(scrollHeight - clientHeight - scrollTop) <= 1`を観測してから従来のscroll書込みへ進みます。待機中にscroll位置、CSS、focus、アプリ状態を補正しません。Endが終端へ到達できなければpollが失敗するため、失敗を成功へ書き換える条件ではありません。

同ファイル:212-215の3/5列・semantic由来のtable最小幅・実幅・水平overflow、:220-230の末尾文字Rangeと上下左右の既存判定（bottom/right/leftは1px）、:233-234の更新後文字列・検索・focus ring・destroyを変更していません。`nativeEnd`の追加記録だけが測定添付の構造変更です。context A-D、per-key Tab経路、CSS override設定も変えていません。

`templates/angular/diff-json.ts:27-37`のJsonViewerはnativeのoverflow regionとtableを使用し、この経路にscroll/focus書込み、effect、observerはありません。`templates/angular/specialist-style.ts:4`のscroll・table契約と、`tests/fixture-app/static-runtime-catalog.ts:44-68`の生成・更新経路も確認しました。生成元・生成済みコピー・harnessの6ファイルはHEADと一致しています。この確認を他のcomponentや全runtime経路の不存在証明へ広げていません。

台帳差分はD103/D104/D133/D013/D080/D147/D169/D170の同テスト参照hash 8件のみです。JSON構造の比較で理由・producer・verified_scope・remaining_scope・再確認条件・両Unknown状態の不変を確認しました。8件とも現行ソースにanchorがあり、hashも一致します。D133の有限browser sourceと静的Unknownの区別は維持されています。

## 診断の根拠と限界

固定raw JSONの3 arms / 6件の最初の測定を再計算し、要約の全値・失敗一覧と一致することを確認しました。case/arm/pageのruntime errorは空です。診断script:250-331は最初の2 RAF後の測定を保存し、後続RAFで置き換えません。後段の1.5秒観測を成功選別として使っていません。

- actual-originalの3/5列は、この計装付き実行では失敗を再現していません。
- native-clone-originalの3列は、scroll最大値8850の明示書込み後、最初の測定で8221となり、末尾bottomがviewportより612.6875px下へ外れています。script:144-188とrawの一致判定により、cloneはdocument script / runtime / inline handlerなしで、元のstylesheet・テキスト・行・root・主要geometry/styleが一致しています。アプリ処理なしでも同型の逸脱が起こる証拠です。
- actual-end-terminal-gateの3列はnative終端pollが7318 → 8849（最大8850、差1）を観測してから測定準備へ進み、3/5列とも最初の測定で既存の全述語を満たしています。

これはnative scrollingとテストの書込みが干渉し得るという説明、および終端を先に待つ修正を支持します。元の通常runで見られた8850 → 8404の正確なbrowser内部タイミングや単一根本原因までは確定しません。追加pollは終端位置を観測するもので、platformのscrollendイベント完了そのものを認定するものでもありません。

## 確認方法と未確認

read-only Pythonでhash、tar member、JSON構造差分、raw測定・要約、HEADとのbytes比較を行い、ソースと固定patchを読解しました。独自のprobe証拠は `review-json-terminal-v1-readonly-probes.json` に保存しました。AGENTS.md、code-review-quality、日本語表現Skill、現行の設計・検証・静的検査契約に従いました。

ブラウザ、build、generation、typecheck、testは実行していません。主担当の実行中targeted検証の結果も参照していません。診断はBUILD NOT_RUNでupdate/search末尾は範囲外なので、その2件の成功を通常R161試験全体の成功へ置き換えません。`normal-v3-failure-summary.json`に残る通常runの1902 pass / 1 fail、SVG NOT_RUNは未解消の検証記録として保持すべきです。修正後の通常チェック、必要な全回帰、候補commitへの証拠の結び付けは主担当が別に完了する必要があります。
