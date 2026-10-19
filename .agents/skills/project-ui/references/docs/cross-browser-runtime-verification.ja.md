# クロスブラウザーの重点実操作検証

`npm run test:cross-browser` は、Playwright 1.63.0 の Chromium・Firefox・WebKit で重点部品を操作する opt-in の検証入口である。既定の `npm test` / `test:ui` と `playwright.config.ts` は既存の Chromium 検証を継続する。追加 spec は `tests/cross-browser/`、追加設定は `playwright.cross-browser.config.ts` に置く。通常の全UI回帰を3engineで行うことを既定のコマンドへ加えない。

| 対象 | 同じケース内で確認する操作 |
| --- | --- |
| Card | 本文からの折り畳み、本文の非表示、見出しへのfocus復帰、同じinputと下書きの保持、profile切替、loadingの意味 |
| Menu | RTLの3階層展開、展開中は各階層1項目・閉時は0項目のroving tabindex、親へのEscape復帰、disabled項目の非実行、deep/back/trigger/context/hoverのTab終了 |
| Dialog | native modal、入力保持、scoped profile、終了保留、busy中の終了抑止、内側Menu、取消・確定と呼出元へのfocus復帰 |
| Snackbar | 5秒、OFF・0秒、actionとfocus復帰、hover/focusの重複pause、残り時間だけのresume |
| DateRangePicker | 無効な日付のdraft・caret・同じinputの保持、locale/profile/format変更、修正、native dialog内カレンダーのkeyboard選択 |
| MessageComposer | draft/caret/同じtextarea、locale/profile、pending、結果不明、reset、古い送信完了の拒否。CodeMirrorの実contenteditable操作とCVA出力も確認 |

guided / dense、RTL、320px、root font 200%、reduced motion の条件を組み合わせ、6ケース×2profile×3engineの36ケースを登録する。各ケースは新しいブラウザーcontextを使う。keyboard・focus・入力・公開fixture stateの結果をassertし、DOM geometry、ARIA snapshot、Axe結果、engine/version/UA、例外・console.error・warningを添付する。Axeのruleを除外しない。retryは0、`test.only`は拒否する。明示的な絞込みは実行receiptに残す。

ブラウザーはタスクまたはCIが所有するcacheへ導入する。既存のプロジェクト依存関係が固定したPlaywright CLIを使う。

```sh
export PLAYWRIGHT_BROWSERS_PATH=/tmp/ui-foundation-playwright-cache-1.63.0
npm exec -- playwright install chromium firefox webkit
npm run ui:sync
npm run ui:check
npm run test:cross-browser
```

runnerは通常の `npm run build` を実行し、同期一致とAngularのstrict full AOTを確認してから、`127.0.0.1` のport 0で専用サーバーを作る。生成物はCLI生成を使う。サーバーを共有の固定ポートへ接続せず、実行終了時に所有サーバーを閉じる。結果は既定で `test-results/cross-browser/` に保存する。`run-receipt.json` はbuild/nativeのactual exit、選んだengine、明示filter、bundle SHA、実行時刻、サーバー終了を記録する。

```sh
UI_CROSS_BROWSER_ENGINES=firefox,webkit npm run test:cross-browser
UI_CROSS_BROWSER_ENGINES=webkit npm run test:cross-browser -- --grep Menu
```

`UI_CROSS_BROWSER_EVIDENCE` は証拠の出力先を指定する。Chromiumの既存Playwright互換実行ファイルを使う場合は `UI_CROSS_CHROMIUM_EXECUTABLE` に絶対パスを渡し、実際に起動したversion/UAで結果を読む。設定の差替え、retry、反復、0件を成功にするCLI optionはrunnerが拒否する。専用設定の `UI_CROSS_BROWSER_URL` はrunnerが所有するloopback originを渡す。`--list`による登録確認とnative実行の合格は分けて記録する。

追加specの型確認は次で再現できる。既存tools/applicationのtsconfigは、この専用specの型確認を含まない。

```sh
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck --types node --target ES2022 --module ESNext --moduleResolution bundler playwright.cross-browser.config.ts tests/cross-browser/runtime-test.ts tests/cross-browser/runtime-cross-browser.spec.ts
```

Snackbarの時計はページ初期化前に `page.clock.install` する。初期化が終わった時刻を基準にpauseし、OFF中のAxe計測だけ時計を再開する。hover/focusを解除したときのeffectは `runFor(0)` で同じ仮想時刻に処理し、残り時間の測定へ入る。設定checkboxの実clickで動いたマウスポインターを通知の外へ置き、native `:hover=false` を確認する。意図しないhoverが起きた場合、タイマーの故障として扱う前にnative focus/hoverと時計の状態を保存する。この手順は猶予の追加や製品timerの差替えを行わない。[Playwright Clock](https://playwright.dev/docs/clock)

Firefoxの `scroll-linked positioning effect` warningは、ブラウザーがスクロール効果を検出した性能上の警告である。既存CodeMirror操作で観測した全文・fixture URL・UA・件数を保存し、その完全一致だけをengine advisoryに分類する。未知のwarning、ページ例外、console.errorは失敗にする。スクロール性能の改善は別の測定対象である。[Firefox Source Docs](https://firefox-source-docs.mozilla.org/performance/scroll-linked_effects.html)

Menuはnative focusが移った項目と戻り項目を記憶する。同じ階層の現在項目をrovingの候補として優先し、祖先階層は開いている親項目、hoverで開く場合は最初の項目を候補にする。スクロールcontainerへTab停止を追加しない。Tab / Shift+Tabは既存のcomposite終了経路を使い、submenu・trigger・context targetのどこからでも外へ出る。Escapeは親階層へ戻る。これはAPGのkeyboard終了と親への復帰を自動操作で確認するための契約である。[WAI-ARIA Menu Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)

2026-10-06の初期計測はbase `9f5430ca87e249af204cc335a8610d0d8040621f` のsnapshotを使った。初回は30/36・actual exit 1、中間候補は35/36・actual exit 1を保存した。Menu候補SHA `99e404d5188711074302963aa7c2948126ce7feb99f3d68a8c755b4e199797ed` と当時のspecを通常CLI生成した計測は次の結果だった。

| Engine | 実version | 完了したケース | failure / skip / retry |
| --- | --- | --- | --- |
| Chromium | 153.0.8010.12 | 12/12 | 0 / 0 / 0 |
| Firefox | 155.0 | 12/12 | 0 / 0 / 0 |
| WebKit | 26.6 | 12/12 | 0 / 0 / 0 |

最終actual exitは0、runtime errorは0、未知warningは0、Firefoxの既知engine advisoryは2件、flaky・timeout・interruptedは0だった。全36のAxe分析でviolationは0、incompleteは13ケース・22rule結果・54nodeだった。内訳はpopupの `aria-controls` 確認が18node、重なり背景または非テキスト装飾のcolor contrastが36nodeであり、raw incompleteを保持する。この数を全アクセシビリティ要件の完了数へ置換しない。正常生成/AOT/build、専用specのstrict型確認、通常980件と専用36件の登録も別の静的検証として記録した。

WebKitの自動操作はPlaywrightが配布するWebKitの実測であり、Safari実機の結果へ拡張しない。FirefoxもPlaywright対応buildである。[Playwright Browsers](https://playwright.dev/docs/browsers) ARIA snapshotはブラウザーの意味構造をシリアライズした結果で、screen readerの音声出力は未測定である。スクリーンショットや人間目視をこの専用コマンドの終了条件にしない。

同じ環境のlocalhostで全3engineにClipboard APIとWebGL2 contextが存在することを読み取りで確認した。Firefox/WebKitは `clipboard-read` / `clipboard-write` のPermissions API descriptorがTypeErrorとなり、Chromiumはread=`prompt` / write=`granted`だった。Clipboardの実I/Oはこの36件の対象外で、APIの存在からI/O成功を推定しない。WebGL2 contextの存在からMapLibreの描画成功も推定しない。CodeMirrorは実編集を確認した代表rendererである。

独立批評は、99e404でsubmenu展開後に同じ階層の別項目へnative focusを移すと、旧親項目にroving0が残るP2を追加実証した。現在項目の優先順を直す1line deltaと対応する正式Menu操作を追加した。修正後のMenu SHA `b5e186f9d573867b9a2353269a24597064c9a06ea85e484041e776a38faef2c8` は、正常CLI生成・strict full AOT/build・専用specのstrict型確認後に、ChromiumのMenu guided 1ケースでnative通過・actual exit 0を確認した。上表の36件は追加修正前の履歴であり、修正後の3engine全36件は統合版凍結後の別測定である。

この証拠は表記したsnapshotと追加Menu候補に限定する。後続のDiagram・Chart等を含む統合ソースは、正常生成した同じ候補のbundleで対象を再測定し、source SHAと実数を更新する。既存181要求の完了履歴と今回の追加検証範囲は個別に扱う。

統合後の `37ecf88b05b6cae1510e3291d7fc75e62217892b` では、上の同階層修正を含めて全3engine36/36がactual exit 0だった。rootの36件summary（開発元の参考資料: `verification/ui-runtime-improvements/root-cross36-37ecf88/native/ROOT-SUMMARY.json`。この生成Skillには含めない）にversion・件数・既知Firefox advisory2・incomplete54と実際のbundle/server終了を保存した。

その後、通常の重点UI74操作で閉MenuのDOMにもroving0が残る2失敗を検出し、`opened()`に合わせて項目とBackを-1へする2guardを追加した。元のforward/backward assertは維持し、公開controlled `open` で閉じてもBack DOMが残るconsumerを追加した。最終製品は `a1ed5c012c5b35a50e8df1038e04ade71cf044c4`、Menuは `cd2d50d883f508f46bb199cf9539236f5328bd0d36de71142e5729fd678bae39`。作者Nav2・独立Menu5＋Nav2・root関連28操作がすべてactual exit 0だった。

最終ソースでは影響するMenu/Dialogだけを各2profile×3engineで再実行し、12/12 actual exit 0を確認した。最終12件summary（開発元の参考資料: `verification/ui-runtime-improvements/root-cross12-a1ed5c0-r2/native/ROOT-SUMMARY.json`。この生成Skillには含めない）に明示grepを保存し、全36件の再実行と区別する。Chromium153.0.8010.12・Firefox155.0・WebKit26.6の各4件、skip/retry/flaky/runtime error/未知warningは0。Axe violationは0、incompleteは12case・21rule記録・52node（ARIA18＋contrast34）を保全している。原36件の残り24件とfinal subsetは個別のsource checkpointとして読む。

rootの最初の再実行はChromium executableの環境変数名を誤って指定し、Chromium起動前4失敗・Firefox/WebKit8成功・actual exit 1だった。製品458入力は不変で、正しい `UI_CROSS_CHROMIUM_EXECUTABLE` に直した別runが12成功した。起動失敗のraw pack（開発元の参考資料: `verification/ui-runtime-improvements/root-cross12-environment-failure-a1ed5c0/PACK-MANIFEST.json`。この生成Skillには含めない）も残し、起動前失敗を製品合格や未実行合格へ読み替えない。
