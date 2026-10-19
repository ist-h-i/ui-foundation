# 公開前ベータ候補の変更記録

`@hiroshi.inoue/ui-foundation@0.1.0-beta.1`の変更記録。自作CLI・テンプレート・Skill・生成コードはMIT License（2026 Hiroshi Inoue）。第三者の条件は保持する。配布タグは`beta`。公開結果・日時・integrityはregistryと公開検証記録で確認する。

## この候補

- 自作MIT本文をnpm候補・生成output・生成Skill・配布アプリへ保存し、同一バイトを検査する。

- checkout不要のCLI・検査器・TypeScript標準lib、依存inventoryと原通知を同梱する。
- 生成SkillへAPI文書とADRを同梱し、配布外の保存記録を必須参照にしない。
- syncにroot単位の排他markerと中断検出を追加する。既存markerがあるとdry-runも拒否する。強制解除・自動復元は行わない。
- 利用アプリへ配信するAngular/RxJS等の基盤依存の原通知を追加する。
- ベータのNode対応を実検証版24.19.0へ絞る。他の版・OSは未保証。

## 必要な更新作業

CLIを更新し、dry-runを確認して再同期する。既存のYAML schema_version=1と部品APIは維持するが、Skill・通知・manifestが変わる。生成物だけを部分コピーしない。アプリのbuild、基本操作、workerと通知の配信を確認する。パッケージ更新だけでは生成コードは更新されない。

## 復旧点と制約

更新前のCLI tarball、アプリのlockfile、YAML、生成物、Skillを一組で保存し、問題があれば同じ組へ戻す。markerが残る場合は[復旧手順](npm-beta-readiness.ja.md#同時実行と中断)に従う。未所有ファイルを採用・削除して復旧したことにしない。

専門部品を含む公開入口は一つであり、25 engine等の依存解決が必要。入口分離、複数旧版の長期保守、全OS/ブラウザー、実サービスの保存/Undoや利用者理解は、このベータ候補の成功だけでは保証しない。
