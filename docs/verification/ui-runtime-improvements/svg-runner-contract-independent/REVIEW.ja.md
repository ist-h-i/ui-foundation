SVG 恒久 runner の偽成功防止だけを独立に承認します。PR13 全体の承認は保留です。

37ecf88 の runner `490967fd…` と修正版 `2f12befdfe27b1c2bdef9fae228e289dd498c8722446e19908b0824dd319e698` を読み、root の現物と候補の byte 一致を確認しました。診断用 PAINT_CONFIG / PAINT_ONE と外部の native URL・証拠先を子環境から除き、fresh work 内の実 native JSON に対して34件、一意性、個別成功、runtime error の欠落なし、必須6手順の成功を要求します。fixture・helper6ファイルは37時点から不変です。

旧 helper の不一致 PAINT_CONFIG で実 exit0・native0件・JSON未生成だった反例を保持しました。この独立監査で旧永久runner全体を同じ条件で実行したとは主張しません。別criticが実 source AST の境界に実施した11 controls（記録済み34件の受入れ1、破損拒否10）は純契約検査であり、ブラウザー合格として数えません。

作者の修正版 hostile-env 実操作記録は34/34、1226 labels、RGBA差0、runtime error0、最低コントラスト14.645で、8構成・locale/precision/dataの要求する34組合せと完全一致します。public consumer production buildと6手順も実0、自己所有server終了が記録されています。ただし作者 after はbase9fの私有stageで、root37とは8入力に差があります（AUDIT.jsonに列挙）。この試験をroot最終統合候補の実操作に読み替えません。

自身は source/proof の照合を実行し exit0です。新たなnative/browser/serverは起動せず、共有source・Git・他stageに書き込んでいません。根拠は AUDIT.json、audit-command.json、原文コピー reviewed-artifacts/、before/after runner です。元37 SOURCE-CHECKPOINTおよび旧FAIL/paint/axe incompleteの判定は変更していません。最終Menu境界、root最新固定源の実結果、docs/HEADの採否は別途必要です。
