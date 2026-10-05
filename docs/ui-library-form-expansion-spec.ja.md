# フォーム基盤と構造化入力の次段階

対象要求は forms-01/02/05/07/09/10/11/12/13/17/28。既存値、Angular formsの接続、native inputと実操作を保ち、名前の登録だけで完了にしない。他のフォーム/一覧/専門要求はmatrixに残す。

- FormField: labelPosition=above/inline。labelWidthはFormLayoutから継承し、狭幅では縦配置する。label/required/describedBy/errorは単一native controlへ接続し、入力を移し替えない。
- FormLayout/FormGroup: 列数・方向・label幅・semantic gapを制御する。FormGroupはnative fieldset/legendでグループ名とdisabledを持ち、子フォーム値を保持する。新しいlabel幅の既定値は専用semantic size役割をYAMLから生成する。
- Textarea: ResizeObserverで幅・profile・表示復帰の後にautoResizeを再計算する。min rows、max height、native manual resize、文字数と値保持を確認する。
- SearchInput: SearchRequest.requestIdとoptionsRequestIdを照合し、同じ語へ戻った場合も古い応答を表示しない。debounce、clear/Enter、IME、loadingを既存候補契約へ統合する。
- CheckboxGroup: MultiSelectのnative選択/上限/全選択を保ち、direction/columnsを制御する。RadioGroup: 初期値・方向・個別disabledとnative arrowを保持する。
- Combobox: typed option templateと共通Overlay配置を接続する。options requestの破棄、選択/自由入力、roving/IME/keyup/blur、条件付き候補focusを再検証する。
- MaskedInput: 9=数字、A=文字、*=英数字とescape literalのmaskを解析する。未入力のplaceholder表示とincomplete保持/明示clearOnBlurを選べる。raw valueと書式付き表示を区別し、不正draftとlast accepted valueを保持する。caret、削除、IME、paste、CVA reset/disabled/validationを検証する。
- OTPInput: 桁数・numeric/alphanumeric・一括paste・native autocomplete=one-time-codeを持つ。先頭0を保ち、長さ違い/不正文字を静かに別のコードへ切り詰めない。認証やOS自動入力の成功は保証せず、実DOM契約とinput/pasteを検証する。
- TagInput/TokenInput: CVA string[]、自由入力/候補のみ、重複の可否、最大件数、個別削除を持つ。native編集+追加/削除buttons、draft保持、制限説明とfocus退避を確認する。実データ変更はアプリが所有する。
- FormActions: native submit/reset/cancel、busy/disabled、方向/整列とprojectionを持ち、送信成功を先取りしない。親FormGroupの入力/エラーを保持する。

検証は設定/sync/check、strictTemplates/AOT、model、両profileのfixture操作、別生成production consumer、320px/200%/RTL/reduced-motion/axe、描画、fresh独立レビューと固定HEADの全npm testを分けて記録する。
