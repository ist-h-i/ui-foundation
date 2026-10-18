# Checker v4 independent review

判定: **approve（指定したv3-typed→v4差分に限定）**。修正を要求する指摘はありません。通常suiteの完了、統合、公開、mergeの判断は主担当が行います。

## 固定対象

- repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`
- branch: `feat/ui-static-warning-release`
- Git base/head: `1ff725d1436ad1154bc5ae09d658c44f3cbfa751`。評価対象はこのcommit上のdirty snapshotです。
- 比較base manifest: `review-checker-v3-typed-snapshot.json`、SHA256 `6924a99ca105008a693e36bdcd2b1a7fb927df1b31c38b935b8cacb39d2ba982`
- 対象manifest: `review-checker-v4-snapshot.json`、SHA256 `618ce2ec512e425e55ae1c826b6cb78ee80d0c9fdf4599ab1e4654f452465e3c`
- v3 tar SHA256: `892331010ab4c767e72a731b6a6cd6c9a7e0635da698e34f225752afa6b4930e`
- v4 tar SHA256: `261a734a46eb51f34d481f2782077c4d464ed4700dd85f2aa7016b971a18bf63`

開始・終了時とも、v3/v4各manifestの23ファイルすべてでtar内bytesのhashが一致し、v4の23ファイルすべてでlive hashも一致しました。両tarから再構成したdiffは、CJS以外の6変更ファイルについて`review-checker-v4-readable.patch`と完全一致しました。CJSを含む変更は7ファイルです。

## 指摘

なし。今回の差分で修正を要するBlocker/Major/Minorを確認しませんでした。

## 確認した意味と経路

- `src/check/scanner.ts:1599`, `:2123`, `:2137`, `:2160`と`src/check/types.ts:106`。HostBindingのkey選択に独立した`keyBranch`を付け、未知class値により`classAlternatives`が失われてもkeyの選択を保ちます。複数keyの積では最終組合せにidentityを付け、128候補の打切り時に未確認を残す既存処理を保っています。
- `src/check/scanner.ts:2010`–`:2019`, `:2127`–`:2149`。native側の`application.state`とhost側の`state`は同じselector Setを共有し、WeakMapが同じ展開結果・key identityを再利用します。keyの候補を各viewで別々のobjectに作り直す経路は確認しませんでした。
- `src/check/scanner.ts:2165`–`:2202`, `:2210`–`:2235`。native contextは親のHostContextごとに作られ、実subjectのvaluesで引かれます。hostOriginsはkey identityの一致を必須にし、従来のclass/id枝の対応も保ちます。key選択がない両viewはともにundefinedとなり、既存の接続を維持します。親instanceとvariantを含むapplicationIdも残るため、同じtemplateを再利用するinstanceをkey identityだけで混ぜません。
- `src/check/scanner.ts:2245`–`:2278`と`src/check/styles.ts:410`–`:455`, `:488`–`:543`, `:581`。incomingとownは初回lookupで分かれ、依存aliasのresolverは元の計算環境・application/subjectを保持します。`keyBranch`の絞込みはこの接続に掛かり、定義poolのコピーやUnknownの完全性認定への変更はありません。
- `src/sync.ts:290`–`:301`, `src/check/entry.ts`, `src/check/bundle.ts`。通常CLIと同梱CLIは同じ`checkSources`を利用します。固定CJSにもidentity作成・variantへの保持・hostOriginsでの一致判定が含まれます。生成CJSのSHA256は`bda770683b9874345e86c98aba5ee344f56f32a86675341351837d6fb7a053ba`です。

`docs/static-checks.ja.md:79`–`:93`の「既知候補を検査し、未知writerを含む完全性は証明しない」という契約と照合しました。

## 新規回帰の期待値

`tests/static/write-sinks.test.ts:241`–`:267`と`tests/static/write-sinks-portable.test.ts:29`–`:46`を確認しました。

- keyがclassかidの排他的選択で、別のleft供給がない場合、親の`.left` aliasと子の`#active` originを組み合わせて12pxを検出する期待はありません。有限値・未知値、逆順key、業務属性を含むkeyの負例はこの条件を満たします。
- 子originも`.left`ならclass枝で到達でき、独立した`class.left` bindingがあればid枝でもleftとactiveが両立できます。到達可能な正例で12pxを検出する期待は妥当です。
- 現在の複数instance fixtureでは、12pxのhostにはgap aliasがなく、gap aliasがあるhostのoriginは0です。未知classはgap writerを作らないので、他instanceから12pxを借りなければ違反はありません。Unknownを残す期待も妥当です。対照probeで12px側にもgap aliasを付けると、同じhostで12pxを検出しました。
- 提示された旧fixtureの条件（未知class値によって12px側にもconsumerのleftが付き得る）では、そのhost自身でaliasが到達し得ます。その条件を負例とする期待は不適切で、現在のinline originによる分離への置換は妥当です。旧fixtureの完全なbytesは今回の固定snapshotに含まれず、旧条件の評価は依頼文と失敗rawに基づきます。

## 実行と生出力

reviewerが実行したコマンドはいずれもrepository rootをcwdとしました。

| コマンド | 終了 | 生出力・成果物 |
| --- | --- | --- |
| `python3 docs/verification/ui-static-warning-release-20261018/review-checker-v4/verify_snapshots.py start` | 0 | [verify-start.json](review-checker-v4/verify-start.json) |
| `node --import tsx docs/verification/ui-static-warning-release-20261018/review-checker-v4/host-key-probe.ts` | 0 | [host-key-probe.log](review-checker-v4/host-key-probe.log), [結果JSON](review-checker-v4/host-key-probe-result.json), `review-checker-v4/cases/*/{direct.json,bundled.stdout.json,bundled.stderr.txt}` |
| `python3 docs/verification/ui-static-warning-release-20261018/review-checker-v4/verify_evidence.py` | 0 | [evidence-verification.json](review-checker-v4/evidence-verification.json) |
| `python3 docs/verification/ui-static-warning-release-20261018/review-checker-v4/verify_snapshots.py end` | 0 | [verify-end.json](review-checker-v4/verify-end.json) |

probeは10件を逐次実行しました。複数keyの負/正、同じhost上のdirectiveの負/正、instance分離と並び替え、同じinstanceでの到達可能対照、primitive参照・用途違反、semantic値でもUnknown維持を確認しました。全件で共有scannerと固定CJSのJSON結果が完全一致しました。各fixture rootにnode_modulesはなく、アプリコードは実行せず、末尾のthrow sentinelも発火しません。CJSは既知違反があればexit 1、Unknown警告のみならexit 0でした。probe全体のlog SHA256は`25df59145dd637e9b18f9ae9992ff88f4e1a72d1400ff40edcae4c217dee33ff`です。

主担当が実行した`node --import tsx --test --test-concurrency=1 tests/static/write-sinks.test.ts tests/static/write-sinks-portable.test.ts`についても、[raw log](host-key-identity-focused-final.log)とreceiptを直接確認しました。exit 0、94 pass / 0 fail / 0 skipped。receiptの実行前後23source hashがv4と一致し、source/bundleの実行中変更は空、log SHA256は`6522d794a15a08b964f0a315a2197b19f4dd3fbd117305ab57e9fd89fd2ba347`で一致しています。このfocused suiteはreviewer自身では再実行していません。

## 未確認・境界

大規模なroot差分全体、full normal suite、型検査、生成一致の再build/sync、ブラウザー、実Angular runtime/Sassコンパイル、任意の実行時CSS/cascadeの網羅は本reviewでは確認していません。通常CLI全体の再実行も行わず、共有scannerの接続はソース、固定CJSの挙動はprobeで確認しました。focused成功や本判定は、それら全条件の成立・merge認可を意味しません。

既存reviewの判定は参照せず、他担当の変更・固定source・生成物に編集を加えていません。再委譲、Git mutation、remote操作、worktree作成・削除は行っていません。追加したreportとprobe類は指定の`review-checker-v4.md`/`review-checker-v4/`に保存しました。
