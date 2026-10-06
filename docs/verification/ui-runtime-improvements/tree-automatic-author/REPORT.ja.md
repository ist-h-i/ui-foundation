# Tree axe 未確定項目の自動補完検証

製品テンプレートの欠陥はこの対象範囲で見つからず、製品コード変更は0件です。恒久的な候補は `tests/ui/tree-axe-contract.spec.ts` と `tests/ui/tree-axe-contract-helpers.ts` の2ファイルです。作者による検証を終え、独立criticの確認へ提出します。

| 実行 | 実結果 |
| --- | --- |
| 正規sync / check / 139 TS strict Angular AOT / browser bundle / CSS | 各exit 0 |
| 既存Tree正式の320px・200%・RTL・reduced motionケース | guided/dense 2 PASS、retry 0 |
| そのケースの変更なしaxe 4.13.0 | 6 scans、violations 0、incomplete node instances 42 |
| 最終追加specのstrict TypeScript | exit 0 |
| 最終追加spec | guided/dense各3、計6 PASS、retry 0 |
| 検出器の負例 | 存在しない参照先、低コントラストを両profileで実際に拒否 |

元42行と現在の6 scansのrule・target・reasonは対応します。各行の分類、原JSONのSHA、補完JSONのpointer、PNGのSHAは `evidence/classification-final42.json` に保存しました。axeのincompleteをpassに置換せず、rule無効化もしていません。

| 原reason | 件数 | 原因と補完した事実 |
| --- | ---: | --- |
| controlsWithinPopup | 18 | axeのaria-haspopup付きaria-controlsを確認待ちにする分岐。実DOMに参照先dialogが一つ存在し、開閉・名前・expandedが一致。開いたdialogへの参照をChromium CDPの実AX backend nodeで確認。閉じたdialogはAXでignored。 |
| nonBmp | 21 | axeが非テキスト記号をテキストcontrast計算前に確認待ちへ送る分岐。表示された同一グリフDOMに実foreground/background pixel、実使用フォント、3:1以上の図形contrastを確認。親treeitemのfalse/true/mixedを実AXで確認し、3状態のpaint geometryが異なることも確認。 |
| elmPartiallyObscured | 3 | 再開時のnative popoverが候補へscrollし、先頭の経路/状態文がscrollport外へ出る。PageUpでscrollTopを0へ戻し、候補フォーカスを維持して全文Range fragmentのclip内表示と所有hit-test、4.5:1以上のtext contrastを確認。 |

24件のcontrast未確定を全て記号とした以前の説明は訂正します。正しくは記号21件、スクロールで隠れた文3件です。

グリフの観測contrastは14.645:1。raw PNGとforeground/background pixel数、platform font、CSSの背景連鎖を保存しました。繰り返し現れるdepartmentの同一DOMは閉じたpopupで露出させて測定し、multi内のグリフは開いたpopupで測定しています。元の重なり状態全てを一枚ずつ撮影したという主張ではありません。parentのchecked状態がプログラムで取得できる装飾グリフとして、図形の基準を用いました。[WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

guidedではpopup scrollTop 484→0、denseでは267→0。PageUp前後でfocused BUTTONの `data-cascader-id=head` は一致します。PageUp後の経路文はguided 7/dense 5、状態文は各4の全fragmentが露出し、全てparagraphをhitします。text contrastは経路14.645:1、状態6.385:1です。beforeのclip不足・非所有hitをJSONに残し、afterで実施したhit判定だけを合格扱いにしています。[WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

native keyboardでTreeSelect検索欄→Tree、End/Spaceによる選択とフォーム値反映、RTL Cascaderの親→子→葉、確定、Escapeによるopener復帰を確認しました。親dialog内では最初のEscapeで子popupが閉じて親を保ち、次のEscapeで親が閉じてopenerへ戻ります。dialog popupのDOM focus移動と閉じ方に対応する検証です。[APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

Chromiumのnative AX/CDPとPlaywright ARIA snapshotはVoiceOverの発話ではありません。VoiceOver.appのインストール済みをread-onlyで確認し、promptなし `AXIsProcessTrusted()` はfalseでした。VoiceOverを起動せず、OS設定・権限を変更せず、実AT発話試験は未実行と記録しています。これらを人の目視確認の完了条件に置き換えていません。[Chrome accessibility reference](https://developer.chrome.com/docs/devtools/accessibility/reference)

途中の新harnessは、実装と異なるmixed glyph文字を固定期待したため4 PASS / 2 FAILでした。原log・trace・test sourceを `evidence/automatic-attempt1/` に保存し、geometryを測る検出器へ修正しました。wheelだけで到達した6 PASSのphaseも `evidence/automatic-final/` に保持し、PageUpを含む最後のfresh6 PASSを別の `evidence/automatic-keyboard-final/` に保存しています。既存の元browser終了FAIL traceも歴史的証拠として保持し、今回のPASSで置換していません。

139テンプレートと生成139TSは同一SHA。最終read時の共有root HEAD `21134c3ebe3a08b40da64197aac59f328ba5e200` と139テンプレート全件・設定・stylesも同一です。Tree SHAは `7209dd27534b1d2e8da9a19441c1118886b48a89d6c42c033fc6278e8ff011f5`。このown snapshotのCLI/Skillは並行するparentのownership変更より前、fixture mainはTreeだけを起動する専用consumerで、その差分をfreeze JSONに明記しました。共有root/Gitへの書込みは0、port5338のlistenは終了後に見つかりません。

これはTreeの自動補完検証と候補提出の範囲です。全181部品の既存完了状態はparentの管理下で維持されます。別ブラウザのmatrix、実AT発話、全状態の全アクセシビリティを合格とする報告ではありません。
