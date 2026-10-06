# 独立 public consumer / Foundation・Media レビュー

判定: **APPROVE（記載した範囲）**。最終公開 consumer、選択した Foundation / Media 境界、追加 Card の狭幅境界に未修正の blocking finding はありません。root の全 npm 検査、全181部品全状態、業務アプリの完成は別の検証範囲です。

最終 source commit: `a808a79dc5f17c1b87280c2881147c8ab5357a9f`。Canonical 入力 SHA256: `f8df0204a162c19bd77b3c448e6bf3a65de66413870f12c32daec5846fd8da19`。root freeze: `82388e8eea2aae64a422cf86a168c08d5a9b798bd290b8d70776309e80b49b9a`。raw入力・資産178件と product freeze147件を main/private/own の bytes/SHA で照合しました。
書込先は `/tmp/ui-foundation-final-catalog-consumer-review` のみ。raw Angular TS139件、通常CLI managed生成物150件。旧60cd513eの承認と原証拠を `snapshots/frozen-338dcf85-60cd513e` に保存しています。

## 最終 source で追加実行した検証

- 通常 CLI sync/check/2回目sync/dry-run は各 actual exit 0。check・2回目sync・dry-run は manifest と全 managed bytes/hash を保持。生成物を直接編集していません。
- 公開 barrel だけを import、tsconfig.include は consumer.ts 一つ、strict/AOT positive actual exit 0。8 negative は各 actual exit 1 と期待する型診断を確認。typed Tree/Scheduler/Table context、ChartKind、FileUpload.value、nullable app FormControl、parser API と ambient 欠落を実compile。Angular CVA接続の完全な値型保証とは区別しています。
- consumer closure138件＋独立数式 worker1件の actual compile/bundle で union139件。raw triple-reference が formula-parser.d.ts を公開 barrel 経由で取り込み、barrelを除く negative では TS7016 を確認。clean production ESM bundle、worker ngc と linker は exit 0。
- Card は公開APIで独立 route を作成し、guided/dense × LTR/RTL、320px・200% の4状態を実測。5 slotとnative入力が画面内に収まり、全 content slot の幅が一致。sameDOM・draft/CVA・focus/selection を保持し、pointer/keyboard操作、折り畳みfocus退避→Enter再展開とdraft保持を確認。page error/warning 0。
- 7 route の actual render は page error/console warning/error 0。specialist のsample見出しだけ h1→h2へharness修正し、文書h1が一つであることを実検査。
- HTTP資産231件を actual bytes/SHA/MIME で再照合。PDF companion 202件・原license 11件・対応source 11件、TTF4件のsource mapping、media notice4原文、third-party notice 240435bytes、lazy vendor 22entryを保持。clean distribution 311files/43774359bytes（source maps含む）。

## 原実行の provenance を保持して継承した検証

native23 + Media2profile各18観測 + Scheduler2profile各9観測は source60cd513e/input338dcf85 の actual pass。最終sourceへの変更は Card CSS の `1fr → minmax(0,1fr)` 1箇所だけで、他138 Angular TS・設定・固定依存・全資産がbyte一致です。`evidence/evidence-inheritance.json` がファイルごとのSHA、旧六route consumerのbyte一致（sample見出し1箇所を除く）、Card参照がpublic barrelだけであることを実検査します。旧結果のinput/commitを最新へ書き換えず、新sourceでfresh実行したケースと分けています。

| 境界 | 原nativeで確認済みの操作 |
| --- | --- |
| DateRange / DatePicker | invalid start＋valid endのatomic retention、real native badInput、format設定変更でもraw/invalid/focus/selection/確定range保持、repair/clear/calendar/explicit resetで新書式適用（2 profile） |
| Composer / Chat | same/new/null・controlled・親CVA reset、旧ACK拒否、unknown draft、app errorと新要求failure/retry/success（2 profile） |
| FileUpload | real File[] mixed intake、atomic CVA/Validator、既存rejection理由live更新、unknown draft/readonly/disabled/reset、remount ID/request epoch |
| Locale / Dialog | public UI_LOCALE とCDK Directionality、明示input/外部attrs優先、scope cleanup/change completion、native Escape/opener focus/draft保持 |
| Tree / Grid | ArrowDown/Enterとpopup CVA、F2/invalid edit draft/app failure/retry、実clipboard、virtual rows、辞書key完全一致のapp提供errorをraw保持 |
| Media player / Caption | 実native play後の旧Promise completionと新request/source epoch、native reentry、実VTTのstable IDs/cue removal/reorder |
| PDF | real workerで異なる2page canvas/text、named region、null unload/terminate、invalid PDF失敗→retry→valid復旧 |
| Gallery / Lightbox | native pointer Stopとpre-focus意図、keyboard再開、2 profile×4rotationのpositive scroll boundsとEscape focus |
| Media live UI | real既存5error・3status・parameterizedARIAのlive辞書更新、再取得/worker再生成0、DOM/focus/FileCVA/app label保持。ImageCompare物理rangeとRTL周囲labelの整合 |
| Scheduler | zone/native datetime/resourceの全3writerでcached status解除、structural UI診断のlive更新、exact-key app failure raw、retry新ID/旧ACK拒否、app events/raw値保持 |
| Specialist | ECharts real SVG、MapLibre canvas/worker/Tokyo marker（外部地図data0）、Sheet real worker SUM=5、CodeMirror/ProseMirror lazy描画 |
| Barcode | real canvasのintrinsic paint320px、named/focusable local scroll region240px、native ArrowRight、document幅320/scroll320（2 profile） |

axe は原観測＋fresh Cardの9状態で violations 0。incomplete rule/node をJSONに保持。旧12画像のactual view証拠とfresh Card画像・specialist render画像も原inputごとに区別しています。UiLocaleScopeのproduction server DI/global trapは原sourceでbrowser globals read 0とowned属性cleanupを確認。host/Renderer2 adapterを使う境界試験であり、fullSSR/hydrationとは区別します。

## Finding / review

独立nativeで報告した Composer explicit resetの旧sendError、DatePicker format変更時invalid draft消失、Media保持済みUI message/ARIAのlive locale不追随、Scheduler cached callback残留はrootが最小修正し、上表の両profile native回帰で解消を確認しました。元失敗のJSON/画像/source SHA、Scheduler最小patchを保存。純model/app提供文言を翻訳せず、library-owned UI境界だけを現在DIへ追随させる契約も確認しています。
修正後SHA: chat `e2dc44531a698721ca72794fcb49af200fff7414359e677dfe47366fb79b34d1`、date-input `f162b85c9367569c79f403a3fd21773e37f57672f30a600e3f50b82e73e99829`、scheduler-controller `238581d46425796e32f941fd486936348d9aa82b1da1c3f13f4b3afb68be7931`。Media各sourceはJSONへ列挙しています。

FileUploadのactual File[]/atomic intake/Validator/reset/unknown/ID epochs、DateRange両側draft、Composer app ACK所有、locale defaults/explicit優先/CDK/属性cleanupはsource reviewとnativeを区別して確認。late Card/Barcode/Scheduler表示findingは他の独立criticの報告で、ここでは採用済みexact sourceの追加実証を行いました。

## 再現入口と成果物

最小 production sourceは consumer.ts / tsconfig.consumer.json。raw source→通常CLI→AOT/negative→clean bundleの入口は次の通りです。依存は package-lock.json のexact版（installed-exact.jsonで46直接依存を照合）。node_modulesはpackへ含めません。

```sh
cd /tmp/ui-foundation-final-catalog-consumer-review
node finalize-input.mjs /tmp/ui-foundation-final-integration/repository
node verify-types.mjs
node build-consumer.mjs
node verify-source-closure.mjs
node verify-main-source-exact.mjs
node verify-root-freeze.mjs
node verify-evidence-inheritance.mjs
node serve-consumer.mjs
# 同じdirectoryの別端末
node verify-card.mjs
node inspect-browser.mjs
node verify-distribution.mjs
# 原selected nativeを再現する場合
node verify-browser.mjs
node verify-media-locale.mjs
node verify-scheduler-locale.mjs
node --import tsx scope-server-trap.ts
```

機械可読結論は evidence/final-review.json。入力/生成物/installed manifests、actual process logs、期待negativeのsource/診断、distribution各file bytes/SHA/MIME、source freeze、native provenance、画像、原failureを含めてpackへ保存します。formal Date4候補は deliverable-tests/foundation-date-format-retention.spec.ts。root正式testの実行とは区別しています。
利用ガイドは `deliverable-docs/docs/ui-library-consumer-guide.ja.md`（SHA256 `3f54fad40b11bcdb42b2bd412858c69efc5204afd2fb6facec9d68aecf2168be`）。レビュアー自己作者の文書であり、このsource承認はガイド自身への独立承認ではありません。

## 未観測

- Native checks cover selected boundaries, not all 181 components and states.
- Backend persistence, actual upload completion, Undo and user/assistive-technology understanding are unobserved. Application ACK/failure callbacks are deliberately supplied; upload entries remain queued.
- Chromium only; Firefox/Safari, OS IME/touch and screen-reader operation are unobserved.
- The inherited actual UiLocaleScope server DI/global trap uses host and Renderer2 adapters; no full SSR rendering or hydration claim.
- axe incomplete entries retain their rule/node evidence and are not counted as passes.
- CSP enforcement, optical barcode/QR scanning, font source recompilation and PGP signatures are unobserved.
- Root full-npm/PR/merge verification is separately owned; no inference of a full-suite pass from this consumer approval.
- No shared Git/generated edits, npm publication or messages to third parties performed by this reviewer.
