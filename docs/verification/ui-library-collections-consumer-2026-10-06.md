# Collections 最小生成consumerのAOT bundle比較（公開生成moduleへの直接import）

今回の両payloadは新しい `snapshot-85c5ffde/dist` に実際に再生成した。旧001c99b3の値・出力は現在の結果へ使っていない。

計測ソースHEAD: `85c5ffdea19135010a30f2cbcf327f77d4ca5669`。生成は独立した `/tmp` snapshotで正本 `src/cli.ts` のsync/checkを `node --import tsx` により実行。生成出力の直接編集はしていない。

同じ Angular `bootstrapApplication` と native button の生成 `ActionControl` を持つconsumerを基準に、実templateへ `Listbox` / `VirtualList` / `SortableList` / `TransferList` を配置したconsumerを比較した。Listbox/TransferListはtyped Reactive Forms CVA、VirtualListはtyped template contextとoutputs、SortableListはtyped immutable rows / itemsChange / canMoveを接続。主計測は公開生成moduleへ直接importした。基準側は `.ui/generated/angular/action-control`、追加側はさらに `listbox` / `virtual-list` / `sortable-list` / `transfer-list` と型のみの `collection-model` / `transfer-model` を使う。

| 実配信ファイル | baseline raw bytes | collections raw bytes | raw差分 | baseline gzip bytes | collections gzip bytes | gzip差分 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| main.js | 324236 | 581408 | +257172 | 104413 | 167208 | +62795 |
| styles.css（共通・同一hash） | 23133 | 23133 | 0 | 3707 | 3707 | 0 |
| JS + CSS | 347369 | 604541 | +257172 | 108120 | 170915 | +62795 |

追加量は**一覧adapter・Forms・CDK・依存する共通コードを含む生成consumer全体の差分**。CDK engine単体のサイズではない。esbuildが実際に書いたファイルをstat/readし、同じバッファをNode gzip(level 9)で測定した。source map、入力source、tarballのバイトは追加bundle量へ算入していない。inline component stylesはmain.jsへ含まれる。HTMLは同一で別記録。

同一条件: Angular/CDK 22.2.1、TypeScript 6.0.3、esbuild 0.28.2、Node v24.19.0。ngc full AOT / strictTemplates / strictInjectionParameters / strict / ES2022。ESM、bundle/minify/sourcemap=true、ngDevMode=false、ngJitMode=false。partial Angular npm modulesには既存scripts/build.mjsと同じBabel linkerを適用。

collectionsの実行JSへのpositive bytesInOutputで `action-control.ts` / `listbox.ts` / `virtual-list.ts` / `sortable-list.ts` / `transfer-list.ts` を確認した。生成sourceとcanonical templateのnormalized SHA-256は一致。source全体と生成全体のnormalized SHA-256、実compiled JS、raw metafiles、linker入力、正確なcommand/exit code/logをJSONへ記録した。MIT noticeはリポジトリ記録とインストール済みCDK LICENSEが完全一致。
直接importの基準main.jsにはCDKとFormsのpositive bytesInOutputが無い。別に保存した公開angular/index barrel経由の比較では、未使用のListbox/TransferList/Forms/CDKが基準main.jsへ残った。このfull-AOT outputにおけるside effect保持の観測から、barrel経由で自動的に削除される保証は作らない。barrel診断は前sourceHEAD a1886aafの別計測として `evidence/collection-consumer-bundle.json` を参照。

同期/一致検査と2consumerのAOT/bundleコマンドはexit 0。先に試した `npm run ui:sync` はtsx CLIのlocal IPC pipeがsandboxで `listen EPERM` となりexit 1。その失敗ログも保持し、同じsrc/cli.tsをIPC server不要の `node --import tsx` で実行して復旧した。共有repoのHEADは前後同じ。共有worktreeのstatusはJSONに記録し、計測には固定commitのsnapshotだけを使った。Browser/AX/axe・意味評価はこのbundle harnessでは実行しておらず、段階の別証拠を参照する。この結果を他のconsumer構成・lazy loading・実機性能へ一般化しない。

証拠: `evidence/head-85c5ffde/collection-consumer-bundle.json`、`evidence/head-85c5ffde/source-manifest.json`、`evidence/head-85c5ffde/generated-manifest.json`、`evidence/head-85c5ffde/measurement-inputs.json`、`evidence/head-85c5ffde/*-positive-inputs.json`、`snapshot-85c5ffde/dist/{direct-base,direct-collections}/metafile.json`、`snapshot-85c5ffde/dist/{direct-base,direct-collections}/{main.js,styles.css}`。再実行: この固定snapshotとdependency symlinkを保持したまま `node harness/measure-85c5ffde.mjs 85c5ffdea19135010a30f2cbcf327f77d4ca5669`。

| command | cwd | exit |
| --- | --- | ---: |
| `git rev-parse HEAD` | `../../../Users/inouehiroshi/Documents/GitHub/ui-foundation` | 0 |
| `git status --porcelain` | `../../../Users/inouehiroshi/Documents/GitHub/ui-foundation` | 0 |
| `git show -s '--format=%H%n%cI%n%s' 85c5ffdea19135010a30f2cbcf327f77d4ca5669` | `../../../Users/inouehiroshi/Documents/GitHub/ui-foundation` | 0 |
| `git ls-tree -r --name-only 85c5ffdea19135010a30f2cbcf327f77d4ca5669` | `../../../Users/inouehiroshi/Documents/GitHub/ui-foundation` | 0 |
| `node --version` | `snapshot-85c5ffde` | 0 |
| `npm --version` | `snapshot-85c5ffde` | 0 |
| `node --import tsx src/cli.ts sync --config examples/ui.config.example.yaml` | `snapshot-85c5ffde` | 0 |
| `node --import tsx src/cli.ts check --config examples/ui.config.example.yaml` | `snapshot-85c5ffde` | 0 |
| `./node_modules/.bin/ngc -p consumers/direct-base/tsconfig.json` | `snapshot-85c5ffde` | 0 |
| `node ../harness/bundle-direct.mjs direct-base` | `snapshot-85c5ffde` | 0 |
| `./node_modules/.bin/ngc -p consumers/direct-collections/tsconfig.json` | `snapshot-85c5ffde` | 0 |
| `node ../harness/bundle-direct.mjs direct-collections` | `snapshot-85c5ffde` | 0 |
| `git rev-parse HEAD` | `../../../Users/inouehiroshi/Documents/GitHub/ui-foundation` | 0 |
| `git status --porcelain` | `../../../Users/inouehiroshi/Documents/GitHub/ui-foundation` | 0 |

幅adapterの保持: Listbox / VirtualListの新AOT出力と実行JSへ viewportInline / clientWidth のコードが残り、両部品のpositive bytesInOutputとsource/template/compiled SHAを `width-adapter-consumed.json` に記録した。これは静的bundle証拠であり、長いラベルの実描画・操作受入はrootの別検証を参照する。

過去001c99b3との比較: 新baseline JSのhashは一致し、新collections JSのhashは変更した。新collectionsは実測でraw +334 B / gzip +94 B。現在の追加bundle量は上表のfresh両出力差分。過去値との比較は補足であり、値の使い回しではない。
