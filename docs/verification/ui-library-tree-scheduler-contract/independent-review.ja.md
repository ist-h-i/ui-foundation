判定は **APPROVE_SELECTED_SCOPE**。現在のTree/Scheduler/Locale対象範囲にblocking source findingは残っていません。全181部品、root全139テンプレートのAOT、Ready状態を承認する判定ではありません。

最終候補はrootprivate `/tmp/ui-foundation-final-integration/repository`。Treeは `d83ad99da42101bcfbbed9f4e00fb7a75645b18e063e029686c653c42da3e82c`、SchedulerControllerは `4f8c5855858ccc66967c51002ff4cc09cc068591cbdd00fcd59eef6a30948b2c`、public indexは `c06b42cf58885d81a0a5fd44e2fa99213efb3c7946679d2f82d46464fa3fb218`。対象16ファイル＋Locale2ファイルのroot/own/正規生成物のSHA一致を試験後にも確認し、実行bundleが保存bundleと同一であることも照合しました。正本ソースを修正したのは作者rootで、この独立reviewerはownのharness/fixture/evidenceだけを変更しました。

実測はChrome/Chromium 153.0.8010.12、Playwrightの実click・keyboardを使用しました。正規sync/check/strict AOT/buildは全exit0。strict AOT対象はownの既存92 TS＋Locale2の94 TSとconsumerです。Tree/Schedulerのpublic exports11モジュールはroot indexのsymbol/type宣言と一致し、同index経由のgeneric consumerを使用しました。Localeはown旧indexにexportがないため正規生成moduleから直接importし、root public indexの正式export宣言は別に照合しています。これをfull139 public AOT成功とは記載しません。negative TreeNode/OrganizationNode/SchedulerEvent/SchedulerEntry4件は各TS2339・exit1で期待どおりです。

| 実行scope | actual結果 | 証拠 |
| --- | --- | --- |
| Prefix/fold IDs＋native labels/descriptions | 2/2・exit0 | evidence/foundation-final/scheduler-id-prefix/probe.json |
| Same-turn app focus transfer＋owned close/Escape/completion | 8/8・exit0 | evidence/foundation-final/scheduler-native-focus/probe.json |
| Accepted UTF16 event ID rendering＋owned return | 2/2・exit0 | evidence/foundation-final/scheduler-utf16/probe.json |
| Locale・keyboard・CVA・wire・native draft・domain・live profile | 6/6・exit0 | evidence/foundation-final/locale-browser/probe.json |
| Escape/dialog order・ASCII・query/CVA・APG/typeahead・native Tab | 16/16・exit0 | evidence/foundation-final/escape16/escape-regressions.json |
| 旧4source不具合の再発確認 | 8/8・exit0 | evidence/foundation-final/original-four8/regressions.json |

native合計は42/42。全caseのpageerror/console warning/errorは0件です。最初の報告の44という合計は訂正済みで、run JSONの実case数42が正本です。profile guided/dense、Escapeは1280 LTRと320/200%/RTLの双方、Locale6件は320/200%/application RTLで実操作しました。Localeケースは両profileの初期値から反対profileへlive変更するため、画像名のprofileは開始値で、画面のprofileは変更後の値です。

独立model16件はexact Tree/Schedulerモデルで再通過しました。65536 UTF16 single-unit DOM token injectivity、raw ID維持、linked/disabled/lazy/stale semantics、独立Intl oracleによるNY/LordHowe/Apia/StJohns/KathmanduのDST・civil membershipとmove validationを含みます。Locale-model＋server DI5件も通過しました。最後のController prefix変更でこれら純モデルは変更されていないことをSHAで確認しています。server DIでdocument/window参照禁止を確認した結果は、全component SSR/hydration試験ではありません。

今回の実source findingは3件で、作者修正後の実操作で閉じています。修正前のsame-turn complete/close後にexternalまたはprojected memoへfocusを移すとopenerが奪う4件、accepted lone-surrogate IDでURIErrorになる2件は以前の失敗JSON/画像を保持しています。063770でfocus8/UTF2が通過しました。追加で合法なx/preview-xのeditor同時展開によりstart/end preview Pと日時INPUTのDOM IDが重複し、label.control=null、実label.clickで日時INPUTへfocusしない問題を2profileで確定しました。foundation-scoped/scheduler-id-prefixに失敗2件、harness、修正前bundle/sourceを保持しています。作者4f8cの `treeDomIdToken(value).replace(/-/g,'%2D')` はDOMの内部境界だけを変更し、x/preview-x/fold/fold-foldのbusiness IDs、event/data/source/requestは不変です。最終nativeで全IDがunique、label.controlとaria-describedbyの参照先が同event、native labelclickが対応input/selectへfocusすることを確認しました。

旧Escapeの4失敗はsource findingではありません。指定ID aは実在しており、初回harnessが展開属性の更新直後にDOM childの描画を待たず進め、native dialogのopen=falseだけを待ってapp signalのclosed反映前にassertしていたものです。実childの可視性、app modalOpen、opener focusを待つharnessのみの修正で成功しました。original-escape-failureに旧JSON/画像4件を保存し、旧/新の画像も確認しています。

source reviewの対象はTree/TreeSelect/Cascader/OrganizationChart/TreeItem＋generic templates/models/load sequence、Scheduler/Agenda＋generic event template/move sequence/models/controller/view、Locale provider/modelと公開mappingです。Foundationのoptional locale/default/message wrappersは日本語fallbackとapp-owned labelsを区別し、business identifiers/CVA/instantを翻訳しません。Treeの検索/typeaheadはeffectiveLocaleを使い、TreeSelectはその値を内側Treeに渡します。APG専用キーとmatched typeaheadだけがconsumeされ、Escape/unmatched/Tabは適切な上位/native経路へ進みます。Schedulerのqueued focusはorigin、current focus、owned scope、reopened editing、reset/destroyで失効を確認し、visible focus先が変更されたapp memo/externalへ介入しません。Scheduleはapp-owned collectionへのproposalでありCVA/保存/instant resolution/実undoはappの責務です。

Foundation08/09のscoped確認では、Turkish I/İ/ıのhuman-label検索・native typeahead・explicit locale override、TreeSelect child localeの伝達、CVA raw IDs＋FormData raw/oneの維持、search input pointer/draftとprofile switchingを実確認しました。SchedulerではlocaleとIntl表示だけが変わり、native draft/memo/input pointers・event sourceが保たれます。explicit Asia/Tokyoはprovider timezoneより優先し、locale/provider変更時のpending requestは有効なまま、explicit zoneを外してeffective zoneが変わる時はsource-change cancellationが発生しdraftが残ります。全localeの全component操作を網羅した結果ではありません。

自動axeは24scanでviolations0。incompleteはaria-valid-attr-value16nodesとcolor-contrast50nodesです。ARIA未判定の理由はaria-haspopupを持つaria-controls参照先をaxeが決定できないこと。Escape harnessでは12回のDOM観測でunique target、role dialog、expanded時visible/open popoverを実確認しました。未判定はJSONにそのまま保持し、all accessibility passとは呼びません。native AX/ARIA snapshotはEscape4組に保存しています。Locale画像6枚、Escape画像4枚、prefix失敗画像2枚を実読し、追加source findingはありません。320/200%ではnative日時editor内の横スクロールがあり、完全な日時は隣接previewで確認できました。guidedの大きいpopupでは下端のDoneボタンへpopup内scrollが必要です。native keyboard操作・draftは検証済みです。

対象要件行はforms19/20、data08/12、dates07、Foundation08/09。OrganizationChartを含むsource reviewは行いましたが、今回のfresh browser42件に全OrganizationChart方向操作を追加したわけではありません。旧独立reviewのnative/model/AOT証拠はprior report/evidenceとして保持し、finalsourceの未実操作caseを通過扱いにしていません。全source AST逸脱検査、real AT、Firefox/Safari、full SSR/hydration、backend/transportやapp-owned save/instant resolution/undoは今回未実施です。native FormDataは孤立surrogateをUnicode scalarへ変換するため、任意UTF16 IDのnetwork wire losslessを保証する結果ではありません。

ownサーバー6件は全run finallyでbrowser.close/server.closeをawaitしてexit0となり、保存した全6portにlistenerが無いことをlsofで確認しました。他のroot/agentプロセスは停止していません。shared repo/Gitはこのagentが変更しておらず、最後のread時もclean、HEAD 8d01adc6497addd97428507a0d3239dbe093a6a9です。

最終機械判定はevidence/foundation-final/verdict.json。source/generated/current freeze、public mapping、browser artifact、positive/negative logs、native JSON/画像、own-server停止証拠は同directoryにあります。parent rootが全139/full181の全体検証結果と照合して統合/PR/mergeを判断するための、限定された独立APPROVEです。
