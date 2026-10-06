import datetime, hashlib, json, pathlib, shutil, subprocess

root=pathlib.Path(__file__).resolve().parent
repo=root/'repository'; evidence=root/'evidence'
initial=json.loads((evidence/'initial-snapshot.json').read_text())
tree=json.loads((evidence/'tree-candidate-application.json').read_text())
mediaAuthor=pathlib.Path('/tmp/ui-foundation-media-strict-candidate-20261006')
treeAuthor=pathlib.Path('/tmp/ui-foundation-tree-escape-final-review/runtime-axe-gap-20261006-120724')
for rec in initial['candidate6']:
    assert hashlib.sha256((repo/rec['path']).read_bytes()).hexdigest()==rec['afterSHA256']
    assert hashlib.sha256((mediaAuthor/'candidate-after'/rec['path']).read_bytes()).hexdigest()==rec['afterSHA256']
for rec in tree['treeSource2']:
    assert hashlib.sha256((repo/rec['path']).read_bytes()).hexdigest()==rec['sha256']
    assert hashlib.sha256((treeAuthor/'portablepack/candidate'/rec['path']).read_bytes()).hexdigest()==rec['sha256']
commands={p.stem:json.loads(p.read_text()) for p in evidence.glob('*.command.json')}
for name in ['media-sync-approved','media-strict','media-build','media-combined-typecheck','media-native','tree-native','tree-strict','media-ast']:
    assert commands[name+'.command']['actualExit']==0,name

verdict={
    'recordedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'decisions':{'media':'APPROVE_MEDIA_STRICT_CANDIDATE','tree':'APPROVE_TREE_AUTOMATIC_SUPPLEMENT_CANDIDATE'},
    'blockingFindings':[], 'findings':[],
    'baseCommit':initial['baseCommit'],
    'mediaManifestSHA256':initial['candidateManifestSHA256'],
    'media6':initial['candidate6'],'tree2':tree['treeSource2'],
    'product139SourceAndGeneratedUnchanged':True,
    'actualChecks':{
        'mediaScopedTscExit':0,'combinedNpmTypecheckToolsAnd139AngularAndMediaExit':0,'formalFreshBuildExit':0,
        'mediaMatchersArgumentsNegationLabelsExact':228,'mediaTestTitlesExact':18,
        'mediaAfterExplicitAny':0,'mediaAfterSuppressions':0,
        'independentMediaNativePassed':5,'independentMediaNativeExit':0,
        'treeScopedTscExit':0,'independentTreeNativePassed':6,'independentTreeNativeExit':0,
        'nativeRetries':0,'nativeSkipped':0,'nativeFlaky':0,'nativeRuntimeErrorsOrWarnings':0,
        'treeOriginalIncompleteNodesRetained':42,
        'treeReasonCounts':{'controlsWithinPopup':18,'nonBmp':21,'elmPartiallyObscured':3},
        'treeReferenceInstancesHashAndPointersVerified':186,'treeAuthorPackPayloadVerified':542,'treeAuthorTarMembersVerified':544,
    },
    'authorResultsSeparate':{'authorMediaNativePassed':18,'authorTreeNativePassed':6,'ourNativePassed':11},
    'remainingLimits':[
        'Media scoped tsc covers three entries and actual transitive TS types; not all UI specs or all-source AST policy.',
        'Tree supplements DOM/Chromium AX, selected glyph paint and clipped-text reachability; original axe incomplete remains incomplete.',
        'No VoiceOver speech, other browser, all UI states, OS changes, backend safety or global integrated PR approval in this scope.',
        'Core ownership v3 approval remains a separate immutable checkpoint.',
    ],
    'aiVisualReadFiles':[
        'evidence/tree-native-artifacts/tree-axe-contract-tree-aut-ae714-pped-text-and-nested-Escape-chromium/cascader-clipping-after.png',
        'evidence/tree-native-artifacts/tree-axe-contract-tree-aut-ecdbe-foreground-background-paint-chromium/paint-mixed.png',
    ],
    'sharedWrites':False,'ownProcessesClosed':True,
    'earlierEnvironmentFailurePreserved':'media-sync.log actual1 IPC EPERM; approved same npm ownclone actual0. Scoped process-read EPERM later approved read only. Transport disconnected before finalpack command; absent files confirmed before resumed write.',
}
(root/'VERDICT.json').write_text(json.dumps(verdict,ensure_ascii=False,indent=2)+'\n')
(root/'REVIEW.ja.md').write_text('''Media strict候補6ファイルとTree自動補完候補2ファイルを、それぞれ限定範囲でAPPROVEします。残るblockerはありません。core ownershipと最終統合PR全体の採否は別です。

Git base9f5430cから独立315入力を作成し候補を適用しました。Media6・Tree2は作者freeze SHAと最終SHAが一致し、製品139 TSと生成139 TSはbaseと同一です。設定、lock、依存や製品APIに候補からの変更はありません。共有source/Git/hostへの書込みは0です。

Mediaの独立AST監査は18テスト名、228 matcherの期待値・否定・labelが全一致です。63のassertion入力式の変更を読み、同じnative属性と値を観測することを確認しました。helperの実HTML型ガードはPlaywrightでbrowser内へ直列化する自己完結関数で、window hook型は本物のMediaCatalog/ApplicationRef/decoderから取得します。fake page、any、型検査抑制は使っていません。

媒体scoped tsc、通常npm typecheckのtools→139 Angular strict/full-template→Media連鎖、正式fresh npm buildは各actual exit0です。scoped tscは3 specと実transitive TS型を検査します。全UI specの型検査や全ソースAST逸脱検査の合格とは扱いません。

自分専用port5473、Chromium、worker1/retry0で媒体5件を実操作し5/5 actual0、skip/retry/flaky0です。native play開始後の旧fulfillment、Stop→new play、playing再入、hide/disable/source/destroy後のstale応答、実VTT取得待ち・差替えと字幕owner、実ImageBitmap解読とclose、実toBlobの遅延とobjectURL廃棄、実PDF Workerの起動失敗・再試行・終了を確認しました。作者18/18と独立5/5は区別しています。

Tree追加2ファイルはstrict tsc actual0、正式全catalog fixture/生成物で両profile各3、計6/6 native actual0です。320px・200%・RTL・reduced motionで実DOM label・開閉、Chromium CDPのAX backend node参照、treeitem checked false/true/mixedと装飾glyph ignored、選択/CVA、親子Escapeとfocus復帰を確認しました。PageUp前後の候補focusは同じhead buttonです。全文fragmentがclip内へ収まり所有paragraphへhit-testします。text contrastは経路14.645:1、状態6.385:1。PNGにforeground/background core pixelsと実platform fontがあり、非色依存の3状態geometryが異なります。計測glyph contrastは14.645:1です。存在しない参照と低コントラストの負例も実拒否します。

原axe42行はARIA18・非テキスト21・scroll clip3です。原rule/target/reason/nodeIndexと判定保持を全42行照合し、補完186参照のSHA/JSON pointer、作者pack542 payload/tar544のSHAを検証しました。axe incompleteはpassへ変更せず、同一DOMで補完した事実だけを承認します。重なりの全状態を一枚ずつ描画検査したという主張はありません。今回のPNG2枚をAIが読みましたが、人の目視・VoiceOver発話・別ブラウザー・全状態のアクセシビリティ評価とは区別します。

初回normal npm syncはsandboxのtsx IPC EPERMでactual1でした。rawを保持し承認済み同コマンドをowncloneで実行してactual0です。最終pack作成前のtransport切断もprocess起動前の問題として保存し、3path不在を確認後に再開しました。既知own runner/server4 PIDとport5473の終了を読み取り確認しました。共有browser/MCPを終了するglobal cleanupは使っていません。追加UI全件980と全181再承認はこの範囲に含めません。

VERDICT.json、evidenceのraw exit/command/log/Playwright結果・trace・PNG、独立auditとPACK-MANIFEST.jsonが根拠です。REPRODUCTION.mdに再現範囲を記載しました。
''')
(root/'REPRODUCTION.md').write_text('''このpackはMedia strict/Tree自動補完の限定承認証拠です。全製品の配布bundleではありません。正本repoのbaseCommit9f5430cをread-only archiveしcandidate/の8ファイルを適用します（package.jsonはMediaのscript proposal）。同base lockから正規依存をinstallし、ui:sync→typecheck→buildを実行します。実argv/cwdと開始/終了/exitはevidence/*.command.jsonにあります。Playwright configsと独立auditはreview-tools/へ保存しています。専用port5473が使用中ならown configのportだけ変えます。

upstream-tree/は原classificationの186参照を相対treeごと保存した必要subsetです。全542 payloadは同manifestSHAの作者原packへ残り、evidence/tree-author-pack-integrity.jsonに全照合を記録します。このsubsetを全542 raw配布と誤認しないでください。原axe42 incompleteとselected supplementは別に扱います。
''')
pack=root/'handoff-media-tree-scoped-review-v1';pack.mkdir(exist_ok=False)
for rel in ['VERDICT.json','REVIEW.ja.md','REPRODUCTION.md']:
    shutil.copyfile(root/rel,pack/rel)
shutil.copytree(evidence,pack/'evidence')
for rec in initial['candidate6']+tree['treeSource2']:
    dest=pack/'candidate'/rec['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(repo/rec['path'],dest)
for rel in ['run-command.py','audit-tree-classification.py','build-handoff.py']:
    dest=pack/'review-tools'/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/rel,dest)
for rel in ['audit-media-independent.mjs','playwright.independent-review.config.ts','playwright.tree-independent-review.config.ts','tsconfig.ui.tree-independent.json']:
    shutil.copyfile(repo/rel,pack/'review-tools'/rel)
shutil.copyfile(mediaAuthor/'candidate-manifest.json',pack/'candidate/media-author-manifest.json')
shutil.copyfile(treeAuthor/'PORTABLEPACK-RECEIPT.json',pack/'candidate/tree-author-pack-receipt.json')
rows=json.loads((treeAuthor/'portablepack/evidence/classification-final42.json').read_text())
paths={'MANIFEST.json','REPORT.ja.md','evidence/classification-final42.json'}
for row in rows:
    paths.add(row['originalResult']);paths.add(row['freshUnmodifiedAxeResult']['file']);paths.update(ref['file'] for ref in row['automaticEvidence'])
for rel in sorted(paths):
    dest=pack/'upstream-tree'/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(treeAuthor/'portablepack'/rel,dest)
for rel in ['tests/ui/media.spec.ts','tests/ui/media-regressions.spec.ts','tests/ui/media-lifetime.spec.ts','package.json']:
    data=subprocess.check_output(['git','show',initial['baseCommit']+':'+rel],cwd='/Users/inouehiroshi/Documents/GitHub/ui-foundation')
    dest=pack/'reference-base'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
records=[{'path':str(p.relative_to(pack)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(pack.rglob('*')) if p.is_file()]
manifest={'createdUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Independent Media strict6 and Tree automatic supplement2; core and full integration separate','fileCount':len(records),'totalBytes':sum(r['bytes'] for r in records),'files':records}
path=pack/'PACK-MANIFEST.json';path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for rec in records:
    assert hashlib.sha256((pack/rec['path']).read_bytes()).hexdigest()==rec['sha256']
print(json.dumps({'path':str(pack),'manifestSHA':hashlib.sha256(path.read_bytes()).hexdigest(),'files':len(records),'bytes':manifest['totalBytes'],'decisions':verdict['decisions']},ensure_ascii=False))
