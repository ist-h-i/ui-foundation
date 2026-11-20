# 公開ベータの利用・更新契約

[English](npm-beta-readiness.en.md)

`@hiroshi.inoue/ui-foundation@0.1.0-beta.6`の導入・更新・復旧の契約です。自作CLI・テンプレート・Skill・生成コードはMIT License（2026 Hiroshi Inoue）で提供し、第三者資産の既存条件を保持します。

## ベータで受け入れる範囲

| 境界 | ベータの契約 |
| --- | --- |
| 配布 | 一つのCLIパッケージがAngularソース・CSS・Skill・検査器を生成する。Angularのコンパイル済みライブラリではない |
| NodeとOS | Node.js **24.19.0**、macOS arm64。他のNode系列・OSは未検証 |
| 利用アプリ | Angular/CDK 22.3.0、TypeScript 6.0.3と記録したlockfile。基礎・専門部品の依存は[利用ガイド](ui-library-consumer-guide.ja.md#依存関係)に従う |
| ブラウザー | 検証構成の重点操作はPlaywright Chromium。その他のブラウザーや支援技術は利用アプリの採用構成で確認する |
| API | YAML schema_version=1、CLIのinit/sync/checkと既存flags、公開Angular barrelの明示export、生成先の構造。manifest/policy/ownership/lockはツールが管理し、アプリが手編集するAPIにしない |
| 検査結果 | CLIのcheckは生成一致＋ソース検査。生成check-ui.cjsはpolicyとソース検査。JSONの既存フィールドとエラー/警告/未設定の意味を維持する |

全件入口 `angular/index.ts` は専門部品まで参照するため、利用時はガイド記載の25エンジンなどを型解決できる必要があります。`angular/core.ts` とbeta.6で加わる `angular/forms.ts` の公開APIは、利用ガイドに記載の基本部品の依存で型解決できます。追加構成は利用アプリで確認します。

## 導入と文書

利用アプリへnpmパッケージを導入し、インストールされたbinでinit/dry-run/sync/checkを行う。[利用ガイドの導入手順](ui-library-consumer-guide.ja.md#導入から画面を作るまで)を参照する。`checks.source_roots`には実際のアプリソースを用意する。

npm内の`docs/`と生成Skillの`references/docs/`へ、API・設計・導入・更新などの利用者文書を同梱する。開発計画、ADR、要求マトリクス、監査・検証記録は同梱しない。アプリのルートに開発元のdocsがあるとは仮定しない。要求マトリクスや開発元の保存記録は、導入したアプリの検証成功を証明しない。配布外の過去ログやfixtureへの参照は必須入力にしない。

自作部分のMIT本文は生成outputと生成Skillの`UI-FOUNDATION-LICENSE.txt`に同梱する。利用アプリのroot LICENSEを上書きせず、配布成果物には`ui-foundation/LICENSE.txt`として保存する。この許諾で利用アプリ自身や第三者コードの条件を変更しない。

npm 内の `assets/third-party/` は全内容を配信成果物に含める。PDF 資産を配信する場合は `assets/pdf-source/` の全内容も含める。生成checkerのCHECKER-NOTICE.txtとCLIのCLI-NOTICE.txtは対象が別。生成アプリの基盤依存にはFOUNDATION-NOTICES.txtも必要。[資産配信](ui-library-consumer-guide.ja.md#css-と配布資産)を参照する。最終HTTP応答のバイト列とworker実行を、単なるファイル存在とは分けて確認する。

## 更新と復旧

[beta.4から安定メッセージIDへ移行](ui-message-migration.ja.md)

1. 作業前に、現在のパッケージ版・lockfile・YAML・生成ディレクトリ・`.agents/skills/project-ui/`を同じGit commitまたはバックアップへ保存する。業務コード・入力データは生成領域へ置かない。
2. リリースノートの再同期要否、YAML/依存/APIの変更、アプリ側の手順、復旧点を確認してCLIの版を更新する。npmの版更新だけではコピー済みコードは修正されない。
3. 同一rootの実行を一つにし、`sync --dry-run`で差分、Skill、通知、manifestを確認する。手編集や未所有ファイルがある場合は停止理由を解消し、上書きで通さない。
4. `sync`とCLI `check`を実行し、生成差分・依存差分・型検査・build・主要操作を確認する。アプリの変更と生成コードを一緒に反映する。
5. 復旧は、記録した旧CLI版だけでなく、対応するlockfile・YAML・生成物・Skillも同じ復旧点へ戻す。新旧を混在させたり、未知の所有物を旧manifestへ採用しない。旧CLIのcheckとアプリ検証を再実行する。

更新・復旧の技術的な確認だけで、将来の互換性を保証しない。ベータは最新候補を中心に保守し、互換性を壊す変更は版とリリースノートで明示する。複数旧版の長期保守は約束しない。

## 同時実行と中断

`sync`はdry-runを含め、rootの`.ui-foundation-sync.lock`を排他的に取得する。既存のmarkerがあれば書込み前に拒否する。PIDは診断情報であり、古い時刻や停止したPIDだけを理由に自動解除しない。

通常終了と、通常のI/O例外から復元できた場合は、自分のmarkerだけを解除する。強制終了や復元失敗ではmarkerを残して次のsyncを拒否する。複数ファイルの更新全体や強制終了からの自動復元を保証するものではない。

markerが残った場合は次の順で復旧する。

1. 同じrootへ書き込む実行者を止め、排他的に扱えることを確認する。所有・停止が不明ならmarkerを残す。
2. markerのroot/run ID/phase/予定パスと前後hash、実ファイル、保存したGit/バックアップを照合する。markerに書かれたパスをコマンドとして実行しない。
3. 変更対象が正当な所有物であることを確認して、YAML・生成物・Skill・manifestを対応する復旧点へ戻す。未所有ファイルや業務入力を削除しない。復元できない部分は未確認として止める。
4. 対象ファイルの復元と実行者停止を確認できたときだけ、記録したmarker自身を明示的に退避する。新しいmarkerに置き換わっていないか再確認する。汎用のforce解除やPID推測による自動削除は提供しない。
5. dry-run、sync、check、アプリ検証を行い、通常の操作へ戻る。

## アプリが決める安全方針

Markdown/HTMLの無害化と通信先制御は別の責任。利用アプリは外部画像・媒体のorigin、CSP、ネットワークアクセス、認証を決める。HTTP(S)/Blobの形式検査があることを、外部への通信が禁止されている証拠にしない。

CSV出力は数式対策を既定で有効にするが、既存TSV/コピーは数式を保持する。未信頼の文字列を表計算ソフトへ渡す場合は、アプリが`serializeTableMatrix(matrix, '\t', true)`を使うwriterへ明示接続する。数式保持が必要な処理と安全な文字列出力を同じ成功条件にせず、実際の貼り付け先でも確認する。TSVの既定挙動はこのベータで黙って変更しない。
