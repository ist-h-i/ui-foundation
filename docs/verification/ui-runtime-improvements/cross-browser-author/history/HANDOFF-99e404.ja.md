# クロスブラウザー候補の引継ぎ

入口は `candidate/minimal-integration.json`、SHA256 `e1a07499c72b4a24887ec8dca052f59ca09be9faafff9b2358b5997f655e8f76`。portable patchは `candidate/cross-browser-runtime.patch`。共有repo・Git・GH・root privateの変更はしていません。

Menuは既存 `15b4978…` → `99e404d5188711074302963aa7c2948126ce7feb99f3d68a8c755b4e199797ed`、lexical5 guardsを `candidate/menu-minimal-delta.json` に保存しました。rootが既存Foundation変更を持つ場合もguarded差分を使い、wholefileで上書きしません。new config/spec/runtime fixture/runner/docsの5 copyとpackage script1guardが追加範囲です。public API・依存追加・生成物直接編集はありません。

source/spec/runtime/configのfreezeは作者外criticへ送付済みです。native後のrunner変更は短い `-c` の設定差替えも拒否する1lineだけです。旧runner811bで36実操作、新runner3d358でsyntax0・negative4・npm alias negative1を記録しました。この差をmanifestに明示し、after-guardのnativeを実行済みとはしません。

作者nativeは3engine各12/12、全36/36、actual exit0。Chromium153.0.8010.12 / Firefox155.0 / WebKit26.6。runtime error0、unknown warning0、Firefox exact engine advisory2、skip/retry/timedout/interrupted/flaky0。Axe全ruleを保持しviolation0、incomplete13case/22rule/54nodeをrawで保存しています。最終bundle SHA256 `36fa3c7a7cd585b5c5a9e15feef5f44e36e3e0fd896fe9b54f0f0494dbc4cd52`、所有serverはactual closed。初回30/36 exit1、中間35/36 exit1と失敗trace/screenshotはhistoryとして残しました。

normalCLI sync/check・full strict Angular AOT/build actual0、専用TS strict0。既定登録980/45 filesと専用36/1 fileはactual0で別記録。既定980件のnativeはこのdelegationでは未実行です。root最終統合版、Diagram/Chart変更、Safari実機、screen reader音声、Clipboard I/O、MapLibre描画をこの36へ含めません。WebGL2 context / Clipboard API exposure / permission descriptorの限界はdiagnostic rawを参照してください。

root統合はmanifest SHA照合 → copy5 + Menu/package guarded edits → 通常 `npm run ui:sync` / `npm run ui:check` → 必要型検査 → `npm run test:cross-browser`。追加specは `tests/cross-browser/` の専用入口で、通常 `npm test` を3engineへ拡大しません。cacheはroot/CI所有パスに置きます。現在のFF/WebKit cache `/tmp/ui-foundation-cross-browser-stage/browser-cache` は1.63.0 exactです。Chromiumは既存compatible executableを `UI_CROSS_CHROMIUM_EXECUTABLE` で渡し、実version/UAを記録しました。

最終36の実行は `source` cwdで `PLAYWRIGHT_BROWSERS_PATH=<stage>/browser-cache TMPDIR=<stage>/runtime UI_CROSS_BROWSER_EVIDENCE=<stage>/evidence/focused-final UI_CROSS_CHROMIUM_EXECUTABLE=<browser-inventory.chromium.path> node scripts/run-cross-browser.mjs`、当時runner811bでした。正式コマンド/絞込み/注意点は `candidate/docs/cross-browser-runtime-verification.ja.md`。

接続断のため新packet/alias確認を一時停止し、root復旧後に既存SHAとpackage未編集をread actual0で確認して再開しました。接続失敗をnative結果へ読み替えていません。観測は `evidence/transport-checkpoint.json`。独立批評の採否・root全sourceの生成結果・PR/mergeはroot scopeです。
