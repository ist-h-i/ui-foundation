FileExplorer の今回の失敗は、有効化の描画前に `focus()` を呼んだ試験の前提不足と判断しました。製品 a808a79dc5f17c1b87280c2881147c8ab5357a9f を変更せず、最小の試験修正だけを限定承認します。

承認対象は `tests/ui/specialist-chart-explorer.spec.ts:109`。無効解除後に `await expect(csv).toBeEnabled()`、`csv.focus()` の後に `await expect(csv).toBeFocused()` を加えます。削除後の host focus、root tabindex、外部 Code の focus 保持を含む既存の事後条件はすべて保持します。

正確なファイル SHA-256 は before `63268d4d85ea31cf330c152dce276ea6caa8bdb72a0035bcdb9862d7dce59327` → after `8887255dfac7e4e94a73357e544551c8f4758a205951163a838a934032aea243`。`minimal-test-only-guard.patch` と両ファイル原文を収録しました。

元の full run は親報告の 973 pass / 7 fail・actual exit 1、親の選択再試行は 10 pass / 2 fail・actual exit 1 のまま保持します。初回 dense と再試行 guided/dense の失敗 trace を独立再実行より前にコピーして読みました。3本とも、問題の CSV focus は `<button disabled ... data-explorer-id="csv">` に解決しています。初回 dense の call@3090 では native uncheck 終了 1327044.537、disabled での解決 1327050.670、focus 呼出終了 1327051.374、after snapshot 1327054.900 で disabled 消去という順です。snapshot の target マーカーを actual focus と混同していません。

`locator.focus()` は Enabled を自動待機しません。対応する retrying assertion を使う提案は [Playwright 公式の actionability 表](https://playwright.dev/docs/actionability) と一致します。uncheck の checkbox 完了と、別の CSV 行の Angular 描画完了は同じ条件ではありません。

独立コピーでは以下を実測しました。全 native run は実 Chromium・2 workers・retries 0 です。

- a808 git archive から生成物をコピーせず canonical sync / check / build、各 actual exit 0。build は正規 Angular strict AOT を含みます。
- 元の試験そのままの両 profile 初回は 2/2 pass、actual exit 0。親の失敗をこの成功で置き換えず、タイミング依存の観測として区別しています。
- 最小 guard と周辺 disabled-first / selected-disabled / draft 保持の2 caseを両 profile で各3回、12/12 pass、actual exit 0。
- 独立した native focus event / disabled focus 境界の4 caseは 4/4 pass、actual exit 0。

独立イベント検証では、両 profile で有効 CSV への focusin → controlled disable → host focusin、checkbox 無効解除 → enabled → CSV focusin → controlled removal → host focusin を確認しました。外部 Code が focus した後の除去では外部 focus を保持しました。

別の stress probe は実 checkbox change の Angular 描画前を意図的に選び、native `focus()` をそのまま呼びました。両 profile とも `disabled:true / csvFocused:false / outsideStayed:true / outsideIsCheckbox:true`。その後の除去でも外部 checkbox の focus を保持しました。製品・native focus・MutationObserver・タイマー・状態更新 API を置き換えていません。この stress probe を、未修正の元試験そのものの再現成功とは数えません。

テンプレート139ファイルは検証前後と共有正本の読み取り照合で完全一致です。collection-runtime は `f4bc68041585eb5e0a06ae7094ac59f8657efeefc5f4e2660e282f0e8f18e559`、file-explorer は `fc1a4143eae0871b4f11d3500934835f889bcbd76ef4a826c818b0b868548e71` のまま。今回の証拠から製品の focus guard を変更する根拠はありません。外部 focus を奪う変更は契約に反します。

環境上の失敗も分離して保持しました。最初の sandbox CLI は tsx の IPC EPERM で actual exit 1、許可された同一入力での canonical run は actual exit 0。最初の trace parser は存在しない snapshotName を期待して exit 1、実際の callId/phase に修正して読取りました。停止時の最初の cwd 文字列比較も macOS の /private/tmp と /tmp の差で signal 前に exit 1、実パスの照合後に own server PID 88061 / port 52052 のみ SIGTERM し listener はなし。共有サーバーや他の browser は操作していません。

既存の専門部品 final pack の report / JSON / manifest の3 SHA を再照合し不変でした。旧 pack の scope、元の失敗、SVG bbox / AX incomplete / paint 未判定を今回の判定で書き換えていません。この followup は別の証拠です。

本 scope の未解決製品 finding はありません。親による正式試験の採用・再実行と全体 npm 検証は別の完了条件です。ここで全ライブラリ・全試験の合格や merge 完了を主張しません。
