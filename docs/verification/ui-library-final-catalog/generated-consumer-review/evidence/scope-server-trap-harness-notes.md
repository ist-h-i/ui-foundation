# Scope trap の準備失敗と範囲

最初の手順は Angular の platform 初期化より前に window などを trap し、framework の `_publishDefaultGlobalUtils` が window を参照したため exit 1 でした。directive の生成には到達していません。

trap を platform 作成後へ移した開発手順も、Angular の開発モード ImagePerformanceWarning が内部 document を要求して NG0210 / exit 1 となり、対象 scope の検証には到達していません。

最終手順は実 consumer と同じ production mode で Angular platform を初期化した後、UiLocaleScope の実生成・effect・破棄だけを trap 内で検証します。実行 exit 0、browser globals read 0 と所有属性 cleanup は scope-server-trap.json/log にあります。host と Renderer2 は単体試験 adapter です。full SSR renderer / hydration の確認ではありません。

これらは試験 setup の失敗であり、ライブラリー finding へ置き換えません。開発中の初期 log は再実行で更新され、このノートは観測した失敗の要約です。
