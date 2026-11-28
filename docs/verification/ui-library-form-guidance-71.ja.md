# フォームの入力条件と操作の採否

Issue [#71](https://github.com/ist-h-i/ui-foundation/issues/71) の公開APIとフォームの操作を、2026年11月28日にデジタル庁デザインシステム（DADS）β版 v2.18.3と照合した。DADSの文言、画像、固定寸法は転用していない。

| 判断 | 適用範囲と理由 |
| --- | --- |
| ラベル、事前の入力条件、訂正方法 | 採用。条件は `hintPosition="before"`、補足は既定の `after`。前後の切替で補足IDは変わらない。エラーは対象項目の近くと必要に応じてフォーム上部に表示する。プレースホルダーはラベルや常に必要な制約の代用にしない。[テキスト入力の使い方](https://design.digital.go.jp/dads/components/input-text/usage/) |
| 必須・任意、読み取り専用、無効化 | 既存の翻訳・必須属性を維持する。閲覧だけで済む値はテキストやDescriptionsを選べる。編集が一時的にできない場合は理由と次にできることを示す。重複処理や権限不足を防ぐ無効化は維持する。[テキスト入力のアクセシビリティ](https://design.digital.go.jp/dads/components/input-text/accessibility/) |
| 入力幅と入力の支援 | 修正採用。文字数が予測できる入力の幅に `controlCharacters` を使える。表示寸法と検証を分け、文字数・単位・候補一覧・選択済みの値・隣接操作はそれぞれの幅を持つ。TextInputとTextareaの `inputMode` はネイティブのキーボードへのヒント。文字列を数値へ変換せず、入力・貼り付け・IMEには従来の経路を使う。Textareaの `autocomplete` は任意。既存の `maxLength` とカウントの契約は維持する。制限前の値を見せてから訂正してもらう場合は `maxLength` を設定せず、利用アプリで検証する。[テキストエリアの使い方](https://design.digital.go.jp/dads/components/textarea/usage/) |
| 選択肢、日付、Checkboxの配置 | 修正採用。直接選べる選択肢にはSelect、検索候補にはCombobox、構造の確認が必要ならTreeSelectまたはCascaderを使う。日付の固定書式は入力前に示し、既知の日付の直接入力とカレンダーでの曜日確認を場面に応じて選ぶ。Checkbox/Switchの既定では操作部とラベルを隣接させる。明示した上配置、横並び、RTLを維持する。[コンボボックス](https://design.digital.go.jp/dads/components/combobox/)・[日付入力](https://design.digital.go.jp/dads/components/date-picker/usage/)・[チェックボックス](https://design.digital.go.jp/dads/components/checkbox/usage/) |
| エラーの表示時機と操作群 | 修正採用。送信を試みた後、訂正が必要な項目を案内する。エラーが出ても入力を保持する。標準フォームでは `[showReset]="false"` を選び、明示的なリセットに既存の既定値を利用できる。取消イベントの後で入力を破棄するかはアプリが決める。既存エラーのアナウンス契約を維持し、入力のたびにエラーを更新するかは利用アプリの判断とする。[ボタンの使い方](https://design.digital.go.jp/dads/components/button/usage/)・[テキスト入力のアクセシビリティ](https://design.digital.go.jp/dads/components/input-text/accessibility/) |

## 伝搬先

- TextInput、Textarea、PasswordInput、SearchInput、NumberInput、Checkbox、Switch、Select、ComboboxでFormFieldへオプションを引き渡す。
- MaskedInput、OTPInput、TagInput、日付・時刻系、TreeSelect、CascaderもFormFieldへ引き渡す。TagInputの編集欄や階層選択のアンカーの幅を指定しても、選択項目やポップアップ内の検索欄には適用しない。
- SliderとKnobは単一ネイティブ操作のため補足位置を指定できる。スライダーや指針、CheckboxとSwitchの寸法はプロファイルに従う。
- RadioGroup、MultiSelect、RangeSlider等のfieldsetを使う部品は、複数の入力をまとめるlegend、グループの補足・エラーを維持する。
- FormGroupはグループ全体の補足、FormErrorSummaryは入力欄への移動、InputGroupは単位や隣接操作の配置に使う。別の画面や閉じた領域を開く必要がある場合は、アプリが `navigate` の受信後に表示を更新し、移動先へフォーカスを渡す。

公開契約は [日本語仕様](../ui-components.md) と [英語仕様](../ui-components.en.md) を参照する。画面の確認には [申請カタログ](../../tests/fixture-app/input-catalog.ts) と [構造化入力カタログ](../../tests/fixture-app/structured-form-catalog.ts) を使う。Chromiumのイベントを用いたIME試験と、OSのIME・実際の支援技術を使う試験は証拠を分ける。
