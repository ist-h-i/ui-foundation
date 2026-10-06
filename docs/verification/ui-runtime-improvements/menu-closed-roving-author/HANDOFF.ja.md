# Menu閉状態rovingの最終引継ぎ

Source入口 `candidate/minimal-integration.json` SHA256 `8556d087b7cbeb59fab3410de0a7c697b14c803065b2fdb4788449886e863ae9`。これはfreeze時点のnative待機を記録したsourceguard入口であり、その後のactual結果は `evidence/nav2-final-summary.json` / `evidence/nav2-final/results.json` が正本である。source4は最終検証後に変更していない。

Menu before b5 `b5e186f9d573867b9a2353269a24597064c9a06ea85e484041e776a38faef2c8` → after `cd2d50d883f508f46bb199cf9539236f5328bd0d36de71142e5729fd678bae39`、本体tabIndexとback bindingへopened guardを加えた2箇所だけ。closed popupはDOMを保持しても項目/backが-1、openでは既存の同level focus優先・祖先expanded fallbackを維持する。Menubar/trigger/IME/defaultPrevented/Tab終了処理は変更していない。

原Navigationのforward/backward同期Tab assertを文字列どおり保持し、同2ケースへ初期closed項目-1、公開open inputをnative checkboxでfalseにする外部終了を追加した。戻りボタンDOM1を保持してtabIndex-1/all5items-1、外部checkbox focus保持、再open時各階層one0をguided/denseで実証した。専用fixture `/catalog/menu-closed-roving` は他の画面へ要素を追加しない。cross spec ebc1とrootのrunner2f12へは変更しない。

readonly root37 cloneにguard適用し通常CLI sync actual0、full strict AngularAOT/build actual0、final専用strict型 actual0、Chromium Nav2 guided/dense 2/2 actual0。retry/skip/flaky0、catalog-testのruntime/warning [] assertionは両方通過。閉状態Axe violations0/incomplete各1rule1nodeをraw保存、Safari実機・screen reader音声へ拡張しない。320px/font200%/RTL条件を設定してnative入力・focusを確認した。新root統合Menu/Dialog12およびNavOverlay28はparent側の別scopeである。

初回sandbox sync IPC EPERM actual1と、初回fixture implicitlabelにoption文字列を含むprofile-name待機timeout2 actual1は `evidence/` に不変で保存した。fixture labelをfor/idへ明確化した後に最終sourceをfresh buildした。原assertを弱めていない。fixture初回a843/candidatee185は `evidence/candidate-first-label-harness/`。root74のbefore72/74はparent保有であり、この作者packには重複して取り込んでいない。

Root37 cloneのdefault registration実数は1006/48files actual0。今回のdeltaは既存2bodyを強化し新test登録0、初期base9f980の別scopeへ合算しない。所有HTTP63753/63853は両receiptclosed=true、lsof read actual1(empty stdout/stderr)でlistener0を確認。共有root/Git/GH/rootprivateへの作者書込み0、所有外process終了0。

`payload-manifest.json` はこのpayloadの相対path/SHA256/bytes一覧、`candidate/closed-menu.patch` はroot37からの差分、`baseline-source/` はguard対象beforeのread-only Git source、`execution-entrance/` は実行したprivateconfig/runner。rootはcandidateの3guardedsource＋新fixture1のみを採用し、proof部分は公開docsへ別whitelistでコピーできる。生成物は直接コピーせず通常CLIで再生成する。
