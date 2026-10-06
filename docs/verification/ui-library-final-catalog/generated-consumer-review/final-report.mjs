import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const input=await read('evidence/input-final.json'),assets=await read('evidence/input-assets-final.json');
for(const [path,sha]of Object.entries({...input.files,...assets.files})){assert.equal(hash(await readFile(path)),sha,path+' own exactness');assert.equal(hash(await readFile(input.source+'/'+path)),sha,path+' private exactness');}
const cli=await read('evidence/final-cli-results.json'),types=await read('evidence/type-results.json'),build=await read('evidence/build-results.json'),closure=await read('evidence/compile-source-closure.json'),generated=await read('evidence/generated-inventory-final.json');
assert.equal(cli.inputDigest,input.sha256);assert.ok(cli.commands.every(command=>command.exit===0));assert.equal(types.results.length,9);assert.ok(types.results.every(result=>result.exit===result.expectedExit));assert.equal(types.results[0].exit,0);assert.ok(types.results.slice(1).every(result=>result.exit===1));
assert.equal(build.workerCompileExit,0);assert.equal(build.consumerSourceSha256,hash(await readFile('consumer.ts')));assert.equal(build.generatedManifestSha256,cli.generatedManifestSha);assert.equal(closure.unionGeneratedTsCount,139);
const mainExact=await read('evidence/main-source-exact.json'),freeze=await read('evidence/root-product-freeze-guard.json'),commit=await read('evidence/final-source-commit.json');assert.equal(mainExact.allEqual,true);assert.equal(mainExact.inputSha256,input.sha256);assert.equal(mainExact.assetSha256,assets.sha256);assert.equal(freeze.allEqual,true);assert.equal(freeze.inputSha256,input.sha256);assert.equal(commit.inputSha256,input.sha256);assert.equal(commit.rootFreezeManifestSha256,freeze.manifestSha256);assert.equal(commit.exit,0);assert.equal(commit.sourceCommit,'a808a79dc5f17c1b87280c2881147c8ab5357a9f');
const inheritance=await read('evidence/evidence-inheritance.json');assert.equal(inheritance.toInputSha256,input.sha256);assert.equal(inheritance.toSourceCommit,commit.sourceCommit);assert.equal(inheritance.unchangedAngularTsFiles,138);assert.deepEqual(inheritance.changedFiles.map(entry=>entry.path),['templates/angular/card.ts']);assert.equal(inheritance.sixRouteSourceByteEquivalence,true);
const oldBase='snapshots/frozen-338dcf85-60cd513e',browser=await read(oldBase+'/evidence/browser-final-results.json'),browserSource=await read(oldBase+'/evidence/browser-source-provenance.json'),media=await read(oldBase+'/evidence/media-locale-results.json'),scheduler=await read(oldBase+'/evidence/scheduler-locale-results.json'),scope=await read(oldBase+'/evidence/scope-server-trap.json'),oldVisual=await read(oldBase+'/evidence/visual-final.json');
assert.equal(browser.length,23);assert.ok(browser.every(result=>result.pass));assert.equal(browserSource.inputSha256,inheritance.fromInputSha256);assert.equal(browserSource.consumerSourceSha256,hash(await readFile(oldBase+'/native-observed-consumer.ts')));assert.equal(browserSource.caseFilter,null);assert.equal(browserSource.caseCount,23);
for(const proof of [media,scheduler]){assert.equal(proof.inputSha256,inheritance.fromInputSha256);assert.equal(proof.results.length,2);assert.ok(proof.results.every(result=>result.pass&&result.checks.every(check=>check.pass)&&result.sameDom));for(const [name,sha]of Object.entries(proof.sources))assert.equal(input.files['templates/angular/'+name],sha);}
assert.ok(media.results.every(result=>result.noReload&&result.appLabelsRetained&&result.fileCvaRetained));assert.ok(scheduler.sourceReview.every(entry=>entry.messageTextCleared));assert.ok(scheduler.results.every(result=>result.appEventsUnchanged&&result.structuralAppValuesRetained));assert.equal(scope.actualClass,'UiLocaleScope');assert.deepEqual(scope.browserGlobalsRead,[]);
const card=await read('evidence/card-results.json'),smoke=await read('evidence/smoke-final.json'),distribution=await read('evidence/distribution-verification.json'),visual=await read('evidence/visual-card-final.json');assert.equal(card.inputSha256,input.sha256);assert.equal(card.sourceSha256,input.files['templates/angular/card.ts']);assert.equal(card.consumerSourceSha256,build.consumerSourceSha256);assert.equal(card.generatedManifestSha256,build.generatedManifestSha256);assert.equal(card.results.length,2);assert.ok(card.results.every(result=>result.pass&&result.observations.length===2&&result.collapseFocusAndDraftRetained&&result.errors.length===0&&result.warnings.length===0));assert.equal(smoke.length,7);assert.ok(smoke.every(result=>result.errors.length===0));assert.equal(distribution.assetCount,231);assert.equal(distribution.pdfSourceKit.length,11);
assert.equal(oldVisual.inputSha256,inheritance.fromInputSha256);for(const entry of oldVisual.images){assert.equal(entry.actualViewImage,true);assert.equal(hash(await readFile(oldBase+'/'+entry.path)),entry.sha256);}
assert.equal(visual.inputSha256,input.sha256);for(const entry of visual.images){assert.equal(entry.actualViewImage,true);assert.equal(hash(await readFile(entry.path)),entry.sha256);}
const axe=[];const collect=(value,name,sourceInput)=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const item of value)collect(item,name,sourceInput);return;}if(Array.isArray(value.violations)&&Array.isArray(value.incomplete)){assert.deepEqual(value.violations,[]);axe.push({name,inputSha256:sourceInput,state:value.state??value.direction??null,violations:0,incomplete:value.incomplete.map(rule=>({id:rule.id,nodes:rule.nodes?.length??0}))});}for(const [key,child]of Object.entries(value))if(key!=='violations'&&key!=='incomplete')collect(child,name,sourceInput);};for(const result of browser)collect(result.observation,result.name,inheritance.fromInputSha256);for(const result of card.results)collect(result.observations,'Card '+result.profile,input.sha256);
const heading=await read('evidence/harness-heading-render.json');assert.equal(heading.inputSha256,input.sha256);assert.equal(heading.consumerSourceSha256,build.consumerSourceSha256);assert.equal(heading.documentH1Count,1);assert.equal(heading.markdownHeading.tag,'H2');
const proofNames=['consumer.ts','tsconfig.consumer.json','finalize-input.mjs','verify-types.mjs','build-consumer.mjs','verify-source-closure.mjs','verify-main-source-exact.mjs','verify-root-freeze.mjs','verify-evidence-inheritance.mjs','serve-consumer.mjs','verify-card.mjs','verify-harness-heading.mjs','verify-browser.mjs','verify-media-locale.mjs','verify-scheduler-locale.mjs','inspect-browser.mjs','verify-distribution.mjs','scope-server-trap.ts','probe-native-date-bad-input.mjs','deliverable-tests/foundation-date-format-retention.spec.ts','final-report.mjs'];const proofScripts={};for(const path of proofNames){const bytes=await readFile(path);proofScripts[path]={sha256:hash(bytes),bytes:bytes.length};}
const guidePath='deliverable-docs/docs/ui-library-consumer-guide.ja.md',guideBytes=await readFile(guidePath);
const limits=['Native checks cover selected boundaries, not all 181 components and states.','Backend persistence, actual upload completion, Undo and user/assistive-technology understanding are unobserved. Application ACK/failure callbacks are deliberately supplied; upload entries remain queued.','Chromium only; Firefox/Safari, OS IME/touch and screen-reader operation are unobserved.','The inherited actual UiLocaleScope server DI/global trap uses host and Renderer2 adapters; no full SSR rendering or hydration claim.','axe incomplete entries retain their rule/node evidence and are not counted as passes.','CSP enforcement, optical barcode/QR scanning, font source recompilation and PGP signatures are unobserved.','Root full-npm/PR/merge verification is separately owned; no inference of a full-suite pass from this consumer approval.','No shared Git/generated edits, npm publication or messages to third parties performed by this reviewer.'];
const report={decision:'APPROVE',scope:'Independent generated public-barrel consumer, selected Foundation / Media boundaries and affected Card geometry only',sourceCommit:commit,inputSha256:input.sha256,assetSha256:assets.sha256,rawTemplateTsCount:input.templateTsCount,generatedManagedFileCount:Object.keys(generated.files).length,positiveAotExit:types.results[0].exit,negativeAotExits:types.results.slice(1).map(result=>({name:result.name,exit:result.exit,expectedExit:result.expectedExit,diagnostic:result.diagnostic})),compileSourceClosure:{consumer:138,separateWorker:1,union:closure.unionGeneratedTsCount},freshVerification:{cli,build,card,smokeRoutes:smoke.map(result=>({route:result.route,errors:result.errors})),distribution:{httpAssetCount:distribution.assetCount,pdfCompanions:distribution.pdfCompanionCount,pdfCompanionLicenseFiles:distribution.pdfCompanionLicenseFiles.length,pdfSourceFiles:distribution.pdfSourceKit.length,fontMappings:distribution.fontChecks.length,thirdPartyNotice:distribution.thirdPartyNotice,fullMediaNotices:distribution.noticeChecks.length,lazyVendorEntries:distribution.lazyOutputs.length},visual},inheritedVerification:{executionSourceCommit:inheritance.fromSourceCommit,executionInputSha256:inheritance.fromInputSha256,notRerunOnFinalSource:true,sourceEqualityLedger:'evidence/evidence-inheritance.json',browserSource,browserCases:browser.map(result=>({name:result.name,pass:result.pass,errors:result.errors,warnings:result.warnings})),mediaLocale:media,schedulerLocale:scheduler,scopeServerTrap:scope,visual:oldVisual},inheritance,axe,mainExact,rootFreeze:freeze,proofScripts,guide:{path:guidePath,sha256:hash(guideBytes),authoredByReviewer:true,independentReviewOfGuide:false},fixedFindings:[{severity:'P2',file:'templates/angular/chat.ts',after:input.files['templates/angular/chat.ts'],problem:'Explicit composer CVA reset retained a previous send-request error.',nativeProof:'Same/new/null CVA and controlled resets; parent Chat delegation; old ACK refusal; fresh error/retry/success in two profiles.'},{severity:'P2',file:'templates/angular/date-input.ts',after:input.files['templates/angular/date-input.ts'],problem:'A dateInputFormat change discarded an invalid draft and its validation without reset.',nativeProof:'Two profiles; raw invalid draft and real native badInput retain DOM/focus/selection and confirmed range; repair/clear/calendar/reset adopt new format.'},{severity:'P2',files:['image-media.ts','media-player.ts','pdf-viewer.ts','image-cropper.ts','barcode.ts'],problem:'Stored Media UI diagnostics/status/parameterized ARIA did not follow live locale dictionaries.',nativeProof:'Five real existing errors plus three existing statuses and physical ImageCompare range, 18 checks per profile; no reload/new worker; DOM/focus/FileCVA/app labels preserved.'},{severity:'P2',file:'templates/angular/scheduler-controller.ts',after:input.files['templates/angular/scheduler-controller.ts'],problem:'Three spread writers retained a stale messageText reader after draft edits.',nativeProof:'All three native zone/datetime/resource writers clear cached status in two profiles. Existing structural diagnostics live-update; exact-key app failure stays raw; retry new request ID and stale ACK refusal.'}],finalDisplayDeltas:{barcode:input.files['templates/angular/barcode.ts'],schedulerView:input.files['templates/angular/scheduler-view.ts'],nativeProof:'Two profiles; real intrinsic barcode canvas in a named local keyboard scroll region, no document overflow; invalid-ISO event/invalid-date layout UI diagnostics update while pure model/app raw values/requests stay unchanged.',affectedCard:{before:inheritance.changedFiles[0].before,after:inheritance.changedFiles[0].after,exactDelta:inheritance.changedFiles[0].exactDelta,freshProfiles:2,freshGeometryStates:4}},remainingBlockingFindings:[],history:{oldApproval:'snapshots/frozen-cb241770',postApprovalDrift:'evidence/post-approval-source-drift.json',previousApproval:'snapshots/frozen-338dcf85-60cd513e',originalFailedEvidenceRetained:true},limits};
await writeFile('evidence/final-review.json',JSON.stringify(report,null,2)+'\n');
const lines=[
'# 独立 public consumer / Foundation・Media レビュー',
'',
'判定: **APPROVE（記載した範囲）**。最終公開 consumer、選択した Foundation / Media 境界、追加 Card の狭幅境界に未修正の blocking finding はありません。root の全 npm 検査、全181部品全状態、業務アプリの完成は別の検証範囲です。',
'',
`最終 source commit: \`${commit.sourceCommit}\`。Canonical 入力 SHA256: \`${input.sha256}\`。root freeze: \`${freeze.manifestSha256}\`。raw入力・資産178件と product freeze147件を main/private/own の bytes/SHA で照合しました。`,
`書込先は \`/tmp/ui-foundation-final-catalog-consumer-review\` のみ。raw Angular TS139件、通常CLI managed生成物${Object.keys(generated.files).length}件。旧60cd513eの承認と原証拠を \`snapshots/frozen-338dcf85-60cd513e\` に保存しています。`,
'',
'## 最終 source で追加実行した検証',
'',
'- 通常 CLI sync/check/2回目sync/dry-run は各 actual exit 0。check・2回目sync・dry-run は manifest と全 managed bytes/hash を保持。生成物を直接編集していません。',
'- 公開 barrel だけを import、tsconfig.include は consumer.ts 一つ、strict/AOT positive actual exit 0。8 negative は各 actual exit 1 と期待する型診断を確認。typed Tree/Scheduler/Table context、ChartKind、FileUpload.value、nullable app FormControl、parser API と ambient 欠落を実compile。Angular CVA接続の完全な値型保証とは区別しています。',
'- consumer closure138件＋独立数式 worker1件の actual compile/bundle で union139件。raw triple-reference が formula-parser.d.ts を公開 barrel 経由で取り込み、barrelを除く negative では TS7016 を確認。clean production ESM bundle、worker ngc と linker は exit 0。',
'- Card は公開APIで独立 route を作成し、guided/dense × LTR/RTL、320px・200% の4状態を実測。5 slotとnative入力が画面内に収まり、全 content slot の幅が一致。sameDOM・draft/CVA・focus/selection を保持し、pointer/keyboard操作、折り畳みfocus退避→Enter再展開とdraft保持を確認。page error/warning 0。',
'- 7 route の actual render は page error/console warning/error 0。specialist のsample見出しだけ h1→h2へharness修正し、文書h1が一つであることを実検査。',
`- HTTP資産${distribution.assetCount}件を actual bytes/SHA/MIME で再照合。PDF companion ${distribution.pdfCompanionCount}件・原license ${distribution.pdfCompanionLicenseFiles.length}件・対応source ${distribution.pdfSourceKit.length}件、TTF4件のsource mapping、media notice4原文、third-party notice ${distribution.thirdPartyNotice.bytes}bytes、lazy vendor ${distribution.lazyOutputs.length}entryを保持。clean distribution ${build.distributionFiles}files/${build.distributionBytes}bytes（source maps含む）。`,
'',
'## 原実行の provenance を保持して継承した検証',
'',
`native23 + Media2profile各18観測 + Scheduler2profile各9観測は source60cd513e/input338dcf85 の actual pass。最終sourceへの変更は Card CSS の \`1fr → minmax(0,1fr)\` 1箇所だけで、他138 Angular TS・設定・固定依存・全資産がbyte一致です。\`evidence/evidence-inheritance.json\` がファイルごとのSHA、旧六route consumerのbyte一致（sample見出し1箇所を除く）、Card参照がpublic barrelだけであることを実検査します。旧結果のinput/commitを最新へ書き換えず、新sourceでfresh実行したケースと分けています。`,
'',
'| 境界 | 原nativeで確認済みの操作 |',
'| --- | --- |',
'| DateRange / DatePicker | invalid start＋valid endのatomic retention、real native badInput、format設定変更でもraw/invalid/focus/selection/確定range保持、repair/clear/calendar/explicit resetで新書式適用（2 profile） |',
'| Composer / Chat | same/new/null・controlled・親CVA reset、旧ACK拒否、unknown draft、app errorと新要求failure/retry/success（2 profile） |',
'| FileUpload | real File[] mixed intake、atomic CVA/Validator、既存rejection理由live更新、unknown draft/readonly/disabled/reset、remount ID/request epoch |',
'| Locale / Dialog | public UI_LOCALE とCDK Directionality、明示input/外部attrs優先、scope cleanup/change completion、native Escape/opener focus/draft保持 |',
'| Tree / Grid | ArrowDown/Enterとpopup CVA、F2/invalid edit draft/app failure/retry、実clipboard、virtual rows、辞書key完全一致のapp提供errorをraw保持 |',
'| Media player / Caption | 実native play後の旧Promise completionと新request/source epoch、native reentry、実VTTのstable IDs/cue removal/reorder |',
'| PDF | real workerで異なる2page canvas/text、named region、null unload/terminate、invalid PDF失敗→retry→valid復旧 |',
'| Gallery / Lightbox | native pointer Stopとpre-focus意図、keyboard再開、2 profile×4rotationのpositive scroll boundsとEscape focus |',
'| Media live UI | real既存5error・3status・parameterizedARIAのlive辞書更新、再取得/worker再生成0、DOM/focus/FileCVA/app label保持。ImageCompare物理rangeとRTL周囲labelの整合 |',
'| Scheduler | zone/native datetime/resourceの全3writerでcached status解除、structural UI診断のlive更新、exact-key app failure raw、retry新ID/旧ACK拒否、app events/raw値保持 |',
'| Specialist | ECharts real SVG、MapLibre canvas/worker/Tokyo marker（外部地図data0）、Sheet real worker SUM=5、CodeMirror/ProseMirror lazy描画 |',
'| Barcode | real canvasのintrinsic paint320px、named/focusable local scroll region240px、native ArrowRight、document幅320/scroll320（2 profile） |',
'',
`axe は原観測＋fresh Cardの${axe.length}状態で violations 0。incomplete rule/node をJSONに保持。旧12画像のactual view証拠とfresh Card画像・specialist render画像も原inputごとに区別しています。UiLocaleScopeのproduction server DI/global trapは原sourceでbrowser globals read 0とowned属性cleanupを確認。host/Renderer2 adapterを使う境界試験であり、fullSSR/hydrationとは区別します。`,
'',
'## Finding / review',
'',
'独立nativeで報告した Composer explicit resetの旧sendError、DatePicker format変更時invalid draft消失、Media保持済みUI message/ARIAのlive locale不追随、Scheduler cached callback残留はrootが最小修正し、上表の両profile native回帰で解消を確認しました。元失敗のJSON/画像/source SHA、Scheduler最小patchを保存。純model/app提供文言を翻訳せず、library-owned UI境界だけを現在DIへ追随させる契約も確認しています。',
`修正後SHA: chat \`${input.files['templates/angular/chat.ts']}\`、date-input \`${input.files['templates/angular/date-input.ts']}\`、scheduler-controller \`${input.files['templates/angular/scheduler-controller.ts']}\`。Media各sourceはJSONへ列挙しています。`,
'',
'FileUploadのactual File[]/atomic intake/Validator/reset/unknown/ID epochs、DateRange両側draft、Composer app ACK所有、locale defaults/explicit優先/CDK/属性cleanupはsource reviewとnativeを区別して確認。late Card/Barcode/Scheduler表示findingは他の独立criticの報告で、ここでは採用済みexact sourceの追加実証を行いました。',
'',
'## 再現入口と成果物',
'',
'最小 production sourceは consumer.ts / tsconfig.consumer.json。raw source→通常CLI→AOT/negative→clean bundleの入口は次の通りです。依存は package-lock.json のexact版（installed-exact.jsonで46直接依存を照合）。node_modulesはpackへ含めません。',
'',
'```sh',
'cd /tmp/ui-foundation-final-catalog-consumer-review',
'node finalize-input.mjs /tmp/ui-foundation-final-integration/repository',
'node verify-types.mjs',
'node build-consumer.mjs',
'node verify-source-closure.mjs',
'node verify-main-source-exact.mjs',
'node verify-root-freeze.mjs',
'node verify-evidence-inheritance.mjs',
'node serve-consumer.mjs',
'# 同じdirectoryの別端末',
'node verify-card.mjs',
'node inspect-browser.mjs',
'node verify-distribution.mjs',
'# 原selected nativeを再現する場合',
'node verify-browser.mjs',
'node verify-media-locale.mjs',
'node verify-scheduler-locale.mjs',
'node --import tsx scope-server-trap.ts',
'```',
'',
'機械可読結論は evidence/final-review.json。入力/生成物/installed manifests、actual process logs、期待negativeのsource/診断、distribution各file bytes/SHA/MIME、source freeze、native provenance、画像、原failureを含めてpackへ保存します。formal Date4候補は deliverable-tests/foundation-date-format-retention.spec.ts。root正式testの実行とは区別しています。',
`利用ガイドは \`${guidePath}\`（SHA256 \`${hash(guideBytes)}\`）。レビュアー自己作者の文書であり、このsource承認はガイド自身への独立承認ではありません。`,
'',
'## 未観測',
'',
...limits.map(limit=>'- '+limit),
'',
];
await writeFile('review-final.md',lines.join('\n'));
console.log(JSON.stringify({decision:report.decision,sourceCommit:commit.sourceCommit,input:input.sha256,freshCardProfiles:2,inheritedNativeCases:23,inheritedMediaProfiles:2,inheritedSchedulerProfiles:2,sourceUnion:139,httpAssets:distribution.assetCount,report:'review-final.md'}));
