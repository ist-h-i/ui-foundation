# npm beta候補の依存・通知監査

この監査は、公開準備用の固定lockfileと実際の候補tarballに対する確認です。npmへの公開、アカウント・権限の変更、自作コードのライセンス選択は行いません。`private: true`の解除や公開名・versionの確定は別の判断です。

## 三つの依存範囲

| 範囲 | 確認する対象 | 利用アプリへの導入 |
| --- | --- | --- |
| CLI・Node検査器 | esbuildが実際に取り込んだ依存。CLIの`dist/CLI-DEPENDENCIES.json`と原通知、検査器の再現bundle・metafileを個別に照合する | パッケージへbundle済み。ブラウザーへ入れない |
| 生成アプリ | [利用ガイド](ui-library-consumer-guide.ja.md#依存関係)の追加runtime engine 25件と、Angular/CDK/Lucide/RxJSのfoundation 7件。その宣言された依存・必須peerのlock closure | アプリが固定版とlockfileを用意する |
| 開発・fixture | Angular compiler、linker、esbuild、TypeScript、Tailwind、試験・decoder等。上記と一部重なる | 利用するtoolchainに応じて別途用意する |

rootの依存はすべて`devDependencies`として宣言されています。この分類は生成アプリの実行時依存の有無を表しません。`npm audit --omit=dev`の結果だけでは今回の監査になりません。`scripts/audit-package.mjs`はdev・optional・peerを明示的に含め、lock内dev件数以上の監査対象が報告されたことを確認します。

生成アプリのclosureは宣言から保守的に求めます。実際のブラウザーbundleに取り込まれるパッケージ数、到達可能なコード量、各機能の安全性を測った値ではありません。OS依存のoptional packageはlock内の版・ライセンスを記録し、インストールされていないパッケージの原通知確認や実行試験は未実施として残します。

## 原通知とPDF source kit

`dist/CLI-NOTICE.txt`と`dist/CHECKER-NOTICE.txt`はそれぞれCLIと検査器に対応します。これらを生成アプリの通知の代わりにはしません。追加engineの`assets/third-party/THIRD-PARTY-NOTICES.txt`に加え、foundationの原通知を`assets/third-party/FOUNDATION-NOTICES.txt`へ保持します。後者は次のコマンドで、現在のlockとインストール済み原文から再生成します。

```sh
node scripts/package-audit/generate-foundation-notices.mjs
```

監査では、該当パッケージのrootにあるLICENSE・COPYING・NOTICE等の原文が、元のCRLFを含むバイト列のまま候補内に含まれることを確認します。CLIの依存inventoryに記録した原文SHA256、パッケージ名・版、checkerの実入力集合も照合します。rootに原文がなければ成功へ補完せず、上流の内容確認が必要なUnknownとします。SPDXや`package.json`の宣言は原通知の代わりになりません。`jstat@1.9.6`の宣言はlockの`license`ではなく、installed `package.json`の旧形式`licenses`にあり、その取得元も記録します。

利用アプリの最終配信先では、`assets/third-party/`全体と`assets/pdf/source/`の全ファイルを候補tarballの元資産と照合します。PDF source kitの保存済み取得hashと実アーカイブを照合し、Liberation Sans四書体は`FONT-MAPPING.json`のbinary hash、インストール済みPDF.jsフォント、配信先のバイト列を比較します。PDF/Map workerに付随する元LICENSEも照合します。

これは原通知・ソース資産の保持を検証する仕組みです。すべての法的義務の充足、PGP署名の検証、FontForgeでの再コンパイルを証明するものではありません。第三者通知の存在からui-foundation自作コードの権利許諾を決めません。

## 実行と証拠

候補tarballをcheckout外へ展開し、その`package/`と、同じ候補由来のconsumerの配信ディレクトリを指定します。監査はnpm registryへの読取り照会と、checkerだけのメモリー上の再bundleを行います。候補や生成先のファイルを書き換えません。

```sh
node --test tests/package-audit/*.test.mjs
node scripts/audit-package.mjs \
  --package-root /absolute/path/to/extracted/package \
  --tarball /absolute/path/to/candidate.tgz \
  --delivery /absolute/path/to/consumer/dist \
  --output /absolute/path/to/dependency-audit.json
```

`--skip-network`は既知advisoryの確認をUnknownにします。registry照会失敗、不正JSON、devを除外した空の監査結果を0件に変換しません。final deliveryを指定しなければ全体もUnknownです。高・重大のadvisory、原通知の欠損、版・hashの不一致は`ActionRequired`で非0終了します。receiptには日時、Node/npm版、実行コマンド、registry URL、lock SHA256、各依存の固定版・宣言ライセンス・integrity、適用範囲、原文・配信資産の照合結果を記録します。`--tarball`を付けると候補のSHA256も記録します。tarballと展開ディレクトリの対応は、同じ候補を使ったpackage検証receiptと照合します。

2026/10/19の証拠は[`verification/npm-beta-20261019/dependency-audit.json`](verification/npm-beta-20261019/dependency-audit.json)へ保存します。root全体の初期照会では293件を対象とするnpm応答が正常に得られ、既知advisoryは0件、高・重大も0件でした。最終候補の判定には、receiptのlock hash・同梱依存・資産結果を使います。初期照会だけでtarballや配信先の合格を示しません。

この結果は取得時点でnpm registryが返す既知advisoryに限定されます。未知の脆弱性、悪意あるパッケージ、アプリ側の入力処理・設定・認可、依存更新後の状態は別途確認が必要です。取得に使った[公式npm audit仕様](https://docs.npmjs.com/cli/commands/npm-audit/)と[監査範囲の説明](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/)を2026/10/19に確認しました。
