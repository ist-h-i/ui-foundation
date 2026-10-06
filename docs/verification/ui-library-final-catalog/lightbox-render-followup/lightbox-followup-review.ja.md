Lightboxの新失敗は、リセット後の描画前に矢印操作を送った試験の順序raceと診断します。媒体製品sourceを変更する根拠はありません。候補は横overflowが解消した実DOM状態を待つ1行を加え、既存のblue/Escape/focus復帰と全geometry/axe assertionsを維持します。採用判断は別criticのexact guardレビューと親の再検証へ渡します。

元の共有失敗trace/error-context/PNGをbyte一致で[別証拠](evidence/original-root-failure/)へコピーしました。reset click終了は790991.374、ArrowLeft開始は790998.858で、その間7.484msです。[compact時系列](evidence/original-final-actions-compact.json)と[記録DOM状態](evidence/original-recorded-viewer-states.json)を保存しています。DOM差分の参照展開は、インストール済みPlaywrightのpost-order snapshot indexingを読み、その記録schemaに従って行いました。製品の内部stateへのアクセス・変更は行っていません。

原traceのArrowLeft action（791000.025）とafter（791003.277）には、guided/RTLの `1 / 3 · 400% · 270度`、slider400、canvas522×696px、image696×522px/rotate270、viewport scrollLeft348pxが残ります。正のscrollLeftは横overflowがある実状態です。期待blueのassertion開始時（791007.492）に初めて `100% · 0度`、canvas174×130.5px、scrollLeft0へ変わりました。赤い写真/1番はそのままでした。canonical `ImageViewer.key()` が、focusしたviewportに横overflowがある間は矢印をnative panへ渡す分岐と一致します。これはtraceとsourceからの因果診断であり、原traceがkeydown内部branchを直接記録しているという意味ではありません。

候補full specはbefore SHA256 `784bb0cf44bf5aaf320032298caa9821b38c087132d9c06c9b17a36fab37996e`、after `3e3b32025f0c3e04cc5d71efadebfe7a5afbb1123dac255e5b07a3d72fe2d4a7`。唯一の追加はreset click直後の次の1行です。

```ts
await expect.poll(()=>viewport.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
```

[guard manifest](candidate-guard-manifest.json)にはbefore/after bytes、唯一1箇所、逆変換byte exact、既存assertion保持を記録しました。[patch](lightbox-render-precondition.patch)、[full before](media-regressions.original.spec.ts)、[full after](media-regressions.guarded.spec.ts)、SHAを拒否条件にする[portable適用script](apply-lightbox-guard.py)があります。共有repoの製品・正式試験は担当から変更していません。

TypeScript検証はbefore/afterとも構文診断0、実Locator型で独立したguardのstrict診断0、追加spanの診断0でした。全specを専用strict tscへ渡すと、既存のSVGElement/HTMLElement genericに対するpaused/textTracks/naturalWidth等の24診断がbefore/after双方にあり、exit2です。挿入位置を正規化して比較したsemantic差分は0でした。この結果を全specのstrict合格として扱いません。[実比較](evidence/guard-syntax-type-comparison.json)と旧失敗logを保持しています。

候補の正式Lightbox targetは1worker/retry0でrepeat4を実行し、**4/4、exit0、41.6s**。両profile・320px/200%/RTL・4方向400%画像の全元geometry/scroll/focus/axe違反assertions、その後のblue表示・Escape・trigger focus復帰を保持しています。[正式raw JSON](evidence/guarded-formal-results.json)、[log](evidence/candidate-guarded-formal.log)、[exits](evidence/candidate-final-validation-exits.json)を保存しました。

追加native DOM/event probeは計32samplesで、原順序16＋guard16です。guided/dense×通常CPU1/隔離CPU6×各4samplesを採取し、keydown capture/bubbleでfocus・defaultPrevented・viewport実寸・status・画像を測定しました。全32でblueへ移動し、原順序16の旧race再現は未達です。計測・trace captureでキーまで18ms以上空き、原traceの7.5msとは異なります。own public barrel媒体fixtureには前の独立検証sectionがあり、root fixture全体のbyte一致cloneではありません。source139と元formal specのbyte一致を根拠にした対象検証で、root全fixtureでの再実行は親の担当です。[native観測](evidence/native-reset-key/observations.json)はこの制約と、実際の描画後ナビゲーションを示します。CPU6は隔離own pageだけにpublic CDPで適用しました。

source139テンプレート・媒体scope/config/lock・元正式Media specは、診断開始時にown a808 snapshotとcanonical53a7858をbyte比較して一致しました。[input guard](evidence/input-guard.json)に原traceのSHA、source比較、既存媒体archiveのSHAを記録しました。親が別途採用したMasonryの正式guardは媒体scope外です。最終readonly観測では共有Media specが候補afterと一致しました。担当から共有repoへの書込みは0です。以前の媒体packはimmutableのまま保持し、このfollowupを別packとして渡します。親のselected/whole再実行の結果はこのpackの採否に含めず、全体合格とは報告しません。
