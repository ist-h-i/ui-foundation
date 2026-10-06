# Treeの全体実行FAILに対する独立追試

判定は **SCOPED_FOLLOWUP_PASS_ORIGINAL_CLOSE_CAUSE_UNCONFIRMED**。正式Treeの320px/200%/RTL/reduced-motionケースはfresh生成consumerでguided/denseともにPASSした。元の全体実行FAILは保持し、終了原因を確定した判定にはしない。全181部品の承認はfalse。

## 元のFAILとcleanup境界

元runはcommit `53a785824b86a34ada3ee8619f710fad57117634`、product `a808a79dc5f17c1b87280c2881147c8ab5357a9f`、実npm exit1、UI980件中977PASS/3FAIL、sourceChanged[]。該当FAILは `tests/ui/tree-catalog.spec.ts:94` のdenseケース。原trace/error-contextと元execution/capture-manifestを `evidence/original-failure/` へcopyし、原本SHAが変更されていないことを追試後にも照合した。

traceの記録順はcontext作成成功→page作成成功→beforeEachのpage.goto(`/catalog/trees`)→約1.542秒後に `Target page, context or browser has been closed`。当該case本体のstepは0件で、profile選択・viewport/RTL/axe操作へ到達していない。page/context/browserのいずれが最初に閉じたかはこのgeneric errorから区別できない。zipにはtest.traceのみでbrowser/pageのtraceがなく、終了の起点は未確定。

失敗後、runtimeErrors fixtureのexpectは成功し、context teardownで同じclosed系errorが追加され、その後Worker Cleanupのbrowser fixtureが終了する。このcaseのcleanupはgotoのerrorより後に記録されている。Tree正式spec、catalog-test、TreeCatalog fixtureにはbrowser/context/page/window.close呼出しがない。前の976(CVA)、977(native name)、978(organization 4方向)、979(native modal/Escape)は全PASSで、980が最後のFAIL。これらの観測だけでroot全体runや環境の終了原因を推測しない。

## fresh consumer追試

共有source/Git/testは編集せず、専用repositoryへ現在の139 Angular TSテンプレート、正本config/CLI/Skill、正式TreeCatalog/spec/catalog-testをexact copyした。Tree source SHAは `7209dd27534b1d2e8da9a19441c1118886b48a89d6c42c033fc6278e8ff011f5`、正式spec SHAは `46e85526cd18304b73edd7d507ec49bdc415148cd2fd4ac0e6d59803b3192434`。以前の42nativeレビューのTree d83ad freezeとは分けて記録する。

正規sync/check→strictTemplates full AOT→browser bundle→Tailwind CSSが全exit0。raw/generated139 TSと構造CSSはSHA一致。main/bootstrapだけをTree-onlyの独立consumerにし、正式case本文とbeforeEach、browser runtime assertionを変更しなかった。port5337、worker1、retries0、Chromium、trace:onで実click・keyboardを実行した。標準sandboxのtsx IPC EPERMはsandbox-sync-attemptに保存し、承認済みのIPC/browser実行で正規検証を完了した。

| ケース | actual結果 |
| --- | --- |
| guided・正式94行ケース | PASS、4.215秒、retry0 |
| dense・同一ケース | PASS、3.770秒、retry0 |

Playwright actual exit0、expected2/skipped0/unexpected0/flaky0。beforeEachに加えて、320px・200%・RTL・reduced motion、横overflow検査、closed/TreeSelect open/Cascader openのaxe、native ArrowDown/End/Spaceの選択、CascaderのRTL ArrowLeft×2/Enter/経路確定が実行された。catalog fixtureがpageerror/console error/warningの空配列をassertした。Node起動のNO_COLOR/FORCE_COLOR warningはnative.logへそのまま保持し、browser warningと混同しない。

実Axe戻り値は両profileの成功traceから追加操作なしで復号し、axe-derived/とaxe-summary.jsonへ保存した。6scanでviolations0。incompleteはaria-valid-attr-value18 nodes、color-contrast24 nodes。前者はhaspopup付きaria-controls参照の未判定、後者はcheckbox等の非文字記号に対する色検査の未判定で、all accessibility passとはしない。

両profileのnative画像2枚を実読した。本文は320px内で折返し、guidedは縦に長く、popupは自身のscroll領域を持つ。画像だけから全操作可否を判断せず、case内の実keyboard/確定操作の成功と合わせて確認した。追加source findingは0件。

追試終了後、own snapshot/正式specと共有sourceの一致・sourceChanged[]、原FAIL error-context/traceの原本一致を再確認した。port5337にlistenerなしをlsofで確認し、他のserver/browserへkillしていない。fresh consumerはTree-onlyで、root全catalog bootstrap、2workersの全980case長期実行、実AT、Firefox/Safari、SSR/hydrationを追試した結果ではない。元のFAILをこの2PASSへ置換せず、rootが次の正式selected/whole full実行を判断するための追加証拠とする。

証拠の正本はevidence/followup-verdict.json、playwright-results.json、native-execution.json、build-stages.json、generated-source-identity.json、成功2trace/2画像、元failure traceとcleanup記録。manifest.jsonで実成果物をSHA固定する。
