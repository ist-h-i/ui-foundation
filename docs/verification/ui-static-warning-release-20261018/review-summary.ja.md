# 独立レビューと指摘の解消

実装・試験の最終候補は `a96f3ec0fae4908cf47be83246b1043f7dc8af26`。全体のbaseは `b4aea63f67447dda1cabcf2da749617aa39c2d6f`。各担当は実装過程の会話を継承せず、正確なbaseと固定snapshotを確認した。主担当は指摘のコード、raw結果、hashを直接照合した。

| 独立担当 | 指摘と対応 | 最終レビューの範囲 |
| --- | --- | --- |
| [検査器 v4](review-checker-v4.md) | HostBindingのalias・再export・未知key、DOM複合代入と増減、数値演算、optional supplier、業務object、key/instanceの分離を修正 | 指定差分に追加指摘なし。sourceとコピーCJSの94回帰、独立10probeを照合 |
| [警告受入 v1](review-warning-v1.md) | 分類gate、全122件の理由、初期906根拠、固定fixtureへの移設を独立確認 | gate実装の指定範囲に指摘なし。後続の根拠更新は別snapshotで再確認 |
| [仮想行 v3](review-runtime-v3.md) | nativeの暗黙scroll Tab停止点と、Firefoxのdisabled要素差を修正 | 13ソースの指定差分に追加指摘なし。独立の有限検証と3ブラウザー30回帰を照合 |
| [CodeEditor v3](review-editor-v3.md) | 文書更新による再設定、disabled直後の遅い更新、scroll/MO後の選択位置、空target ranges、後続Markdown handler抑止を修正 | 23ソースの指定差分に追加指摘なし。36 modelとnative正負回帰を照合 |
| [配置・popupの試験訂正](review-test-corrections-v1.md) | DOMの実寸法、現行caption、busy解除後のEscapeという契約にassertionを合わせた | 17ファイルのsnapshotに指摘なし。元の失敗traceと37根拠hashの更新を照合。通常入口による関連72件も後続で成功 |
| [高速Tabの試験時間](review-fast-tab-budget-v1-publication.md) | 同一instanceのA→B→C→D全体だけを90秒枠にした。各キーの待機、行数削減、assertion削除はない | 12ファイルの指定差分に指摘なし。1040/2064キーと元の時間切れtraceを照合 |
| [表示観測器 v2](review-post-burst-paint-v2.md) | [v1のMajor指摘](review-post-burst-paint-v1.md)を採用。同じDOMの識別値が変わって戻る履歴を、祖先の行番号・selectorまで捕捉するよう修正 | 26ファイルの固定snapshotに追加指摘なし。20組のold/new比較、終了時cleanup、3ブラウザー60件のraw添付を照合 |
| [SVG隔離準備](review-svg-preparation-v1.md) | 正本のtsconfigとfixture全体をコピー対象へ追加。実一時ツリーの正負回帰を追加 | 14ファイルのsnapshotに指摘なし。229入力・50依存・全334例外の入力、symlink cleanup、既存34シナリオのassertion維持を照合 |
| [JsonViewerのEnd終端](review-json-terminal-v1.md) | native End開始後の試験側scroll書込みを、終端位置を確認した後へ移動。元の1px・3/5列・focus・更新/検索を維持 | 16入力の固定snapshotに指摘なし。元の失敗・scripts-free対照の最初の測定・台帳8参照hashのみの変更を照合。通常入口のA〜D全4件は主担当が別途確認 |
| [公開証拠の集計 v4](review-evidence-recipe-v4.md) | v1〜v3のMajorを採用。raw件数・終了・hash、対象scope、固定repository rootとの対応を集計前に検査 | 32入力の固定snapshotに追加指摘なし。35回帰と別担当の16件の実I/O負例、実runtime48/native180のrawを照合。通常gateとarchive生成は主担当が別途確認 |
| [最終runへの証拠対応 v5](review-evidence-recipe-v5.md) | normal-v4・最終718 Git blob・検証ツール65件への対応を確認。元のv3失敗とJsonViewer診断を別記録として収録 | 29入力の固定snapshotに指摘なし。35回帰、5局所負例、実source差分5/9件、旧失敗83成果物を照合。最終normalの完了とarchiveの現物確認は主担当が担当 |

表示観測器の修正では、各キーのtrusted focus・順序・方向・cancel状態・公開range・DOM数の即時assertionを維持した。連続操作後の可視性は最初の測定値を保存し、同じDOM実体・論理identityを保ったまま有限時間内の描画を確認する。style・装飾class更新を許可する正例と、継続する画面外・遮蔽・focus変更・置換・識別値の往復を拒否する負例を含む。

必須指摘を除外した例はない。v1はrequest changesのまま保持し、修正前のv11はbuild中断・browser未実行として保持した。重要な追加修正は別のfresh reviewerで再確認し、元の失敗を成功へ書き換えていない。

公開証拠レシピの[v1](review-evidence-recipe-v1.md)・[v2](review-evidence-recipe-v2.md)・[v3](review-evidence-recipe-v3.md)もrequest changesの履歴を保持する。元のcaptureにcwd欄はないため、依頼された固定repository contextから期待する絶対rootを明示し、rawのconfig・起動引数・対象fileと照合する。元receiptにcwdが記録されていたという主張は加えない。実記録を変更せず、別scope・別checkout・部分結果・失敗を受理しないことを確認した。詳細は[主担当の照合記録](review-evidence-adjudication-v4.json)にまとめた。

新しい集計レシピは、Git blobと候補入力を直接照合し、curatorでも正常結果・scope対応を再検査する。旧レシピとshared validatorは凍結したまま、新run用の別ファイルとしてレビューした。[v5の主担当照合](review-evidence-adjudication-v5.json)はレシピのレビュー記録であり、通常runの合格やarchiveの生成記録とは区別する。

最終ソースとの対応は [candidate-manifest-v8.json](candidate-manifest-v8.json) に記録した。718入力はcommitのblobと一致する。検査器snapshotとの差は別途レビューしたCodeEditor helperの生成所有権エントリー、試験訂正snapshotとの差は後続レビュー済みの根拠更新と今回のJsonViewer終端観測である。仮想行13ソース、Editor23ソース、表示観測器のtest/helper、SVG準備14ファイルは各最終snapshotと一致し、台帳の後続8hashはJsonViewerのfresh reviewで確認した。台帳は908根拠・92ファイルとなり、全122件のUnknown、理由、producer、CSS上書き契約を維持している。

各reviewの「指摘なし」は指定差分のレビュー結果であり、任意の実行時条件、全画面品質、merge認可を意味しない。通常テストと未限定の180件、別runtime 48件の実行結果・対象bytes・未保証範囲は [最終検証記録](README.md) と公開proofに分けて記録する。詳細なsnapshot、probe、raw log、過去の失敗資料はhash付きの選択proofに含め、残りのローカル履歴も保持する。

レビュー後、主担当は最終commitの718入力から作った別checkoutで通常テストv4の終了0を確認した。UI 1,903件・SVG 34件を含む全回帰が成功し、root/privateのsourceは不変、全309 compiled fileも過去の180件・48件の対象と一致した。新レシピを一度ずつ実行して結果とproofを作成し、460ファイルのhash、nested snapshot・trace、private checkpointが含まれないことを現物照合した。正本は[最終結果](release-results.json)と[proof照合](release-proof-verification.json)であり、レビュー時点の未実行状態を書き換えていない。

高速Tabレビューの公開用コピーは、末尾の空行1行だけを除いた。内容・評価・指摘は不変で、reviewerの原文bytesとhashは選択proof内に保持している。
