# 浮動表示6要求

対象はoverlays-05..10。Drawer、BottomSheet、Popover、Tooltip、HoverCard、ConfirmPopoverの要求を実装し、他の181要求をmatrixから削除しない。

- Drawerはnative dialogの左右上下の物理位置、専用semanticの幅/高さ、明示pixel寸法、modal/nonmodalによる背景操作、既存Dialogの終了理由/保留/busy/slotsを接続する。RTLで物理位置を勝手に反転しない。
- BottomSheetはnative dialogの下端表示、viewportまたは明示高さに対する段階、段階変更のnative buttonsとrange、閉じ方、header/body/footerの操作を持つ。段階/profile/幅を変更してもフォームを再生成しない。段階は正の昇順比率（最大1）、選択は有効なindex。ドラッグを必須の操作にしない。
- Popoverは実HTMLElementへのclick/hover/focus/manual起動、配置/反転/viewport内制限、外側click/Escape/閉じる操作、終了保留を扱う。native popoverはDOM/profile/RTLの所属を維持し、modal内の内容は同じmodal内へ置く。外部終了/対象喪失/破棄で自前focusだけを復帰する。
- Tooltipはmessageだけのrole=tooltip、表示/非表示遅延、focus/hover/明示click、Escape、anchorのaria-describedbyへの自分のIDだけの追加/除去を扱う。Tooltipへfocusを移さず、操作を投影しない。Escape後は同じhover/focusが続く間に再開しない。
- HoverCardは非modalのプレビューとheader/body/actions、表示/非表示遅延、anchorと内容をまたぐhover/focus保持、明示clickとTabによる補助操作を持つ。hoverだけに必須情報/操作を隠さない。
- ConfirmPopoverは対象操作の確認/取消意思とbusy、error/retry、終了保留を扱う。confirmRequestedはUIの意思表示。アプリが結果を確認してcomplete()またはopen=falseを接続するまで保存成功や実Undoを先取りしない。

共通Overlayのstack、可用な対象、scope-exit、observe/position、既存focus/native Dialogを利用する。timer/listener/attribute/observerを破棄し、対象変更、hidden/inert、連続Escape、外部更新、狭幅/200%/RTL/reduced motion、エラーと入力保持を検証する。名称のみ/未実装stub/コンパイルだけでverifiedにしない。

子の入力/候補が消費したEscapeとIME変換中のEscapeを親終了に使わない。共通Registryのbubble処理とnative cancelの制限は[ADR](adr/0001-overlay-escape.md)へ記録する。hiddenのDrawer/Sheetはnative closeでmodalを解放する。閉じて開く際の入力保持と、明示破棄後のアプリ所有open状態を区別する。

テンプレート、正本YAML/schema、semantic roles、Skill、fixture `/catalog/floating`、モデル、strictTemplates/AOT、別生成production consumerを揃え、rootの全検査とfresh-context独立レビュー・描画を分けて記録する。

参照: [APG modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)、[APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)、[HTML native popover](https://html.spec.whatwg.org/multipage/popover.html)。Tooltip patternはwork in progressと記され、完全なAPG認証と表現しない。
