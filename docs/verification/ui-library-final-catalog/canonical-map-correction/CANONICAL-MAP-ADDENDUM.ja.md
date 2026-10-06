# 53a7858 制御マップの正式試験参照修正

確定コミット `53a785824b86a34ada3ee8619f710fad57117634` の制御マップで、foundation-07/08の2参照に独立consumerコピーの旧ファイル名を残していました。以前の「参照欠落0」はそのコピーでの存在確認を含み、全ての正式参照を確定Gitへ照合した証明ではありませんでした。共有製品・試験を変更せず、マップの参照先とSHAだけを修正しました。

| 対象 | 旧参照 | 正式参照 |
| --- | --- | --- |
| foundation-07/08 | `tests/ui/date-format-draft.spec.ts`、SHA `476d8104c7dc77f6bf97af643b7147b9d4941a853495591d93b6c6e3252eec5a` | `tests/ui/foundation-date-format-retention.spec.ts`、SHA `5af3c6c61f2b7ab8f6613a3758db96662130a6e974ed0c8bde9c1c6d61cd4aa3` |

正式試験を全文読みました。guided/denseの各2ケース、計4登録で、nativeの不完全日付をHome/Backspaceで作り、`badInput`を偽装しません。不正な文字列・表示書式・同じ入力DOM・focus/caret・INVALIDと直近完全rangeをprovider書式切替中も保持し、修復・clear・reset・カレンダー選択後に要求書式を適用する検証です。ここではソースと正式参照の確認を記録し、進行中の全npm成功は先取りしません。

新マップは `evidence/requirements-48-controls-53a7858-canonical.json`、SHA `fa44f543f2abb441d71d49044c9f7599373a3d063de59ade0edfb14d8b24cc3a`。全48行・207原文制御・公開契約と製品SHAを保持し、修正は上記2参照だけです。旧マップと旧114ファイルpackは変更していません。

全ての実装115参照と正式試験94参照、計209レコード・重複除外88ファイルを、53a7858のGit blobと共有正本の実bytes/SHAへ照合し直しました。path/hashの不一致0。独立コピーに古い同名ファイルがあるかどうかで判定していません。台帳は `evidence/53a7858-canonical-map-reference-audit.json`、実終了0のログは同名`.log`です。

Foundation-08の公開契約は、現在辞書で再評価するライブラリ所有の保持状態、アプリ原文の不透明な保持、操作時に捕捉するパラメータを含みます。旧P2は既に修正・再検証済みで、原文の「言語・日付書式・RTL」を変更するものではありません。全181の完了と最終マトリクス・文書の承認は、親の固定全npm実終了0と最終証拠を受領してから別に判定します。
