# クロスブラウザー作者実測の保存入口

このパックは base `9f5430ca87e249af204cc335a8610d0d8040621f` から追加 Menu b5 までの作者証拠を保存する。統合 root `37ecf88b05b6cae1510e3291d7fc75e62217892b` は親から通知された取り込み先の識別子であり、後続の root 検証をこのパックの実測へ合算しない。

| 段階 | actual exit | 実数 | 保存したMenu |
| --- | --- | --- | --- |
| [初回生結果](evidence/focused-before/results.json) | 1 | 30/36 | base 15b497… |
| [中間生結果](evidence/focused-after/results.json) | 1 | 35/36 | 3a2303… |
| [旧候補生結果](evidence/focused-final/results.json) | 0 | 36/36 | 99e404… |
| [追加修正の生結果](evidence/focused-same-level-native/results.json) | 0 | Chromium guided Menu 1/1 | b5e186… |

各段階の `.exit`・`run-receipt.json`・ログ・summary、失敗の trace/PNG/error context を改変せず同梱した。新しい試験やbuildは、このパック作成では実行していない。旧99の36件をb5の全36件へ読み替えない。retry/skipは全段階0。actual結果・bundle SHA・engine versionは [proof-scope.json](proof-scope.json) と元rawを参照する。

[初回clock観測](evidence/diagnostics-before.json)、[最初の全経路診断の失敗](evidence/diagnostics-full-clock-before-navigation.json) と [訂正した全経路診断](evidence/diagnostics-full-clock-before-navigation-v2.json) を保存した。Firefoxのnative hoverが通知を正当にpauseする観測と同時刻effect flushを記録し、Snackbar製品sourceを変更しなかった。

[環境](evidence/browser-inventory.json)・[3エンジン起動](evidence/browser-availability.json)・[実インストールログ](evidence/browser-install-firefox-webkit.txt)・[所有サーバー終了](evidence/own-cleanup-final.json) を同梱した。Firefoxの [警告全文](evidence/focused-final-warnings.json)、Axeの [raw incomplete](evidence/focused-final-incomplete.json) も保持する。WebKitはSafari実機ではなく、ARIA snapshotはscreen reader音声ではない。Clipboard実I/O、MapLibre描画、通常980件nativeは作者測定の範囲外。

[最終候補入口](candidate/minimal-integration.json) と [baseline source入口](sources/baseline-9f/) のSHAをmanifestへ記録した。失敗trace内に保存された初回・中間の実spec/helperは `sources/from-trace/` に元byteのまま抽出し、zip内memberとの対応を `proof-scope.json` に記録した。旧packとHANDOFFは `history/` に保存し、現候補へ適用する指示と区別する。

[files-manifest.json](files-manifest.json) はこのツリーの各通常ファイルについて相対path・SHA256・bytes・出所を列挙する。manifest自身のSHAとtar SHAは外部 `public-proof-pack-receipt.json` が持つ。rootはこの完全な相対ツリーを公開docsの選んだ場所へコピーし、入口リンクと厳密なwhitelistで採用できる。生成物・個人profile・認証情報・browser実行ファイル・node_modules・無関係な過去証拠は同梱しない。
