# beta.4 から安定メッセージIDへ移行する

[English](ui-message-migration.en.md)

`0.1.0-beta.5` は破壊的変更を含むプレリリースです。日本語原文をキーとする辞書を使い続ける場合は、`@hiroshi.inoue/ui-foundation@0.1.0-beta.4` と、その版で使っているlockfile、YAML、生成物、Skillを一緒に固定してください。beta.4 の利用ガイドは、その版のnpmパッケージで参照できます。

## 版を指定して更新する

1. アプリのソース、パッケージ設定とlockfile、YAML、生成物、`.agents/skills/project-ui/` を同じ時点で保存します。生成先に手編集を加えている場合は、その内容も控えます。
2. 候補版は `npm install --save-dev --save-exact /absolute/path/to/candidate.tgz` で導入します。npm公開後は、tarballの代わりに `@hiroshi.inoue/ui-foundation@0.1.0-beta.5` を指定できます。CLIを実行する前に導入版とlockfileを確認します。
3. `./node_modules/.bin/ui-foundation sync --dry-run` で変更を確認します。生成先から旧 `angular/locale-en.ts`、`angular/locale-ja.ts`、`SKILL.en.md`、`SKILL.ja.md` が削除されます。手編集済みや所有者が不明なファイルについては、変更内容を保存して所有範囲を確認してから同期します。プロンプトや自動化が旧Skillパスを指定していれば、`.agents/skills/project-ui/SKILL.md` に切り替えます。
4. `./node_modules/.bin/ui-foundation sync` で生成し、アプリのimportと翻訳を更新します。`./node_modules/.bin/ui-foundation check`、アプリの厳密なAOTビルド、代表画面の操作確認を行います。生成コードが使う依存とアプリ側の設定も確認します。

## 独自辞書を移す

`provideUiLocale` や `[uiLocale]` の `messages` と、`uiEnglishMessages`、`uiJapaneseMessages` のimportを外します。標準の日本語・英語文言は実行時のロケールで選ばれます。部品の定型文言を上書きする場合は、アプリの辞書に移して `translate` を設定します。アプリ所有文言に使っていた `UiMessagePipe` や `uiMessage(source, ...)` は、アプリの翻訳APIに置き換えます。部品の安定IDを直接表示するには、テンプレートでは `UiStableMessagePipe`、TypeScriptでは `injectUiMessage()` と `UiMessageRequest` を使えます。引数を取るIDには名前付き引数のオブジェクトを渡します。

[旧キーと新IDの対応表](ui-message-map.json)で元のキーを検索し、部品と用途に合うIDを選びます。同じ操作に表示文言とアクセシブルネームの両方がある場合は、それぞれを確認します。

| 旧辞書キー | 新IDまたは対応方法 |
| --- | --- |
| `閉じる` | ダイアログの操作は `uiFoundation.dialog.closeAction`、ポップオーバーは `uiFoundation.popover.close` です。同じキーを使っていた他の部品は対応表で確認します。 |
| `ダイアログを閉じる` | ダイアログのアクセシブルネームは `uiFoundation.dialog.closeLabel` です。他のダイアログ関連部品は対応表を確認します。 |
| `未選択` | Selectは `uiFoundation.select.noSelection`、Cascaderは `uiFoundation.cascader.noSelection` です。部品ごとにIDが異なります。 |
| `展開`（表示時にタイトルを連結） | `uiFoundation.card.expand` に `{ title }` を渡します。タイトルはアプリのデータとして維持し、文全体の語順を翻訳で指定します。 |
| `{limit}件まで選択してください。` | 一覧の選択上限の場合は `uiFoundation.collection.selectionLimit` に `{ limit }` を渡します。0件、1件、複数件の表示を確認します。 |

例えば beta.4 で `閉じる` を `終了` に上書きしていた場合、ダイアログだけに適用するなら `uiFoundation.dialog.closeAction` に登録します。ポップオーバーも上書きするなら同部品のIDにも登録します。旧版で一文の断片を上書きしていた場合は、文全体のIDに移し、必要な名前付き引数を渡します。

[辞書を遅延取得する共通の接続例](../examples/locale-adapter.ts)と[利用ガイド](ui-library-consumer-guide.ja.md#locale文言rtl-の責任)を参照してください。編集中や処理待ちに言語・方向を切り替え、入力、選択、表示済みの結果を確認します。アプリ所有文言はアプリの翻訳に従い、ライブラリの文言が更新されても業務処理は再実行されないことを確認します。

## beta.4 に戻す

保存した時点のアプリソース、パッケージ設定とlockfile、YAML、生成物、Skillを一式で戻します。そのlockfileから依存を再導入し、`0.1.0-beta.4` のCLIで `check` を実行します。アプリを再ビルドし、代表画面も操作してください。生成物がバックアップにない場合は、復元したYAMLと正確な旧版を使い、クリーンなcheckoutで同期します。手編集の扱いを確認できるまで、退避した内容を保管します。

配布物の検証構成はAngular/CDK 22.2.1、TypeScript 6.0.3です。Angular 21・TypeScript 5.9はその構成に含まれません。TypeScript 5.9で試した際、既存の `Popover` のテンプレートが使うブラウザーAPIと、その版のDOM型宣言に互換性の問題がありました。生成コードの全件入口を採用する前に、導入先のコンパイラーで確認してください。[ベータ利用契約](npm-beta-readiness.ja.md)
