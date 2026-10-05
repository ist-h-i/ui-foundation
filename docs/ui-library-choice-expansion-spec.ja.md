# 数値・色・編集・段階・条件の7要求

対象はforms-22..26/29..30。全181要求の原文・制御項目を保持し、残るListbox/Cascader/TreeSelect/Transfer/予定/一覧/媒体/専門/共通基盤を省略しない。

| 要求 | 実装する契約 | 必須の実観測 |
| --- | --- | --- |
| Slider / RangeSlider | finite min/max、minからの正のstep、重複しないnative datalist目盛りと文字ラベル、単一値/順序付き範囲、native keyboard/CVA/validation | native矢印/Home/End、両端の交差抑止、境界と小数、不正modelを黙って置換しない、disabled/readonly、外部値更新、RTL/狭幅 |
| Knob | 値/範囲/step/unit/readonly、SVG指針とnative range、pointer captureと明示増減 | native keyboard・pointer/touch代替ボタン、設定/値不正から復旧、pointer cancel/destroy、semantic独自寸法のprofile切替 |
| Rating | 評価数、半段階、clear、readonly、native radio群、未評価/不正/必須の区別 | 実radio選択とarrow、半段階の実値、0への解除、外部状態、label/fieldsetの意味と局所wrap |
| ColorPicker | hex/rgb/hsl表示/入力、alpha、パレット、自由選択、native color/range、raw editor保持 | focus直後のreal fill/paste、未完成raw値と検証、blur書式変換、外部model/CVA、alpha0/100、palette専用/readonly |
| InlineEdit | 読取/編集、保存要求とrequestId、取消、入力検証、pendingとapp結果/失敗/再試行 | 同じnative editorの保持、Enter/Escape/IME、連打1request、失敗時未保存値、stale/destroy結果拒否、owned focusだけ修復 |
| Stepper / Wizard | 現段階/canProceed、前後、明示branch、mounted panels、defaultまたはdeferred app承認 | 分岐後の実経路と戻る、入力DOM同一、進行禁止、外部現段階/step除去/disabled、保留と再試行、owned focus、完了/再開 |
| FilterBuilder / QueryBuilder | typed field/operator、再帰AND/OR、値検証、追加/除去/解除、保存requestId/失敗/復旧とsnapshot | 実結果の絞り込み、0/false/欠損、全型の実編集、複数階層・グループの結合、入力保持、保存連打/stale/readonly、clear/restore |

数値は表示の安全なfallbackと保持中の不正modelを区別する。ユーザーが編集した場合だけmin基準へsnapし、validatorが問題を返す。端点が刻みに合わないmaxは到達可能な値を表示する。設定不正は明示し、そのcontrolsで変更を許可しない。

Colorの編集開始では、そのnative入力に表示されている文字を保持する。focusで表示書式を別のraw文字へ差し替え、selectionや高速pasteを壊さない。未完成入力はerrorとともにそのまま保持し、妥当なblurで指定formatに揃える。透明度OFFではalphaを含むモデルを無言で不透明へ変えない。

保存・条件の永続化・UI段階を進めてよい業務判断・backendの二重更新保証はアプリが所有する。UIのrequestIdは自分の結果適用/連打抑止の契約で、I/O取消やbackend保証ではない。新しいmodel/reset/destroy後の旧結果はその編集へ適用しない。

Wizardは保留中にcanProceed・分岐先・利用可能な段階が変わると古い移動承認を無効化する。実ブラウザーの両profileで旧承認がtrueとなった4条件を再現し、修正後false/入力段階保持を確認する。Wizardは実移動経路を戻り、branchで省略した段階へ勝手に戻らない。native controlsをmounted/hiddenで保持し、ライブラリがフォーム値のコピーを捏造しない。親のwizardは入れ子wizardのstepsを所有しない。

Filterはserializable条件データだけを扱い、SQL/コード評価/通信を持たない。pure compile関数はスナップショットを作り、rowのown propertyだけを見る。未設定グループは絞り込みへ含めず、設定済みORが空グループでmatch-allにならない。候補/値が不正な条件は実結果を表示せず、問題を伝えて復旧する。saved snapshotはUI内の復元で、サーバー保存の結果をアプリが明示通知する。

正本YAMLのsemantic size.knobを両profileへ加え、roles/schema/tests/tokens/生成Skill/contextへ同期する。追加Form CVA publicationは共通ValueControlのprotected primitiveに置き、通常ユーザーcommitはdisabled/readonly/busyを守り、明示app結果がconfirm済み値をpublishする経路と分ける。

生成元→public exports→設定→Skill→デモ→モデル/strict AOT/consumer→ブラウザ/axe/描画→fresh独立レビューを一貫して更新する。一時出力のprototype合格は、repoへの統合/正本設定/consumer/全体検査の完了へ読み替えない。

操作契約は一次資料の[Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)、[Multi-Thumb Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/)、[Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)を実際に参照した。native range/radioを使い、範囲の端点のDOM順を固定し、依存する最小/最大を更新する。Slider系のtouch支援技術の実機操作は未実施であり、native採用や自動検査だけで成功を保証しない。Knobは明示増減buttonも維持する。
