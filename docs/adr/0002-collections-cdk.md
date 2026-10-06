# 0002: 一覧の仮想化とドラッグはAngular CDKの公開APIで接続する

状態: 採用。2026-10-06。公開APIの生成consumer、両profileの実操作、独立レビューと全880試験の実終了0で確認した。

## 背景と比較

181要求のうち、固定高さのVirtualList/Listbox、SortableList/TransferListと共通仮想化・ドラッグ基盤が必要になった。独自viewport/drag engineはスクロール端、タッチ開始、pointer cleanup、並べ替えとDOM復帰の保守範囲を増やす。既存Angular 22.2.1と同じ版の`@angular/cdk@22.2.1`を比較対象にし、registryのpeer、配布tarballと実LICENSEを確認した。MIT、Angular ^22/^23、RxJS ^6.5.3/^7.4.0で現構成に適合する。Materialの見た目や別のOverlay基盤は導入しない。

## 判断

公開`CdkVirtualScrollViewport`/固定高さstrategy/`CdkVirtualForOf`と、`CdkDropList`/`CdkDrag`/`CdkDragHandle`/`Dir`を採用する。private API、CDK内部DOMへのpatch、indexだけで外部データを確定する契約は持たない。行とviewportは専用の意味トークンを測定し、profile変更を同じDOMへ適用する。previewは元のparent内へ置く。固定高さは可変高さの自動測定へ読み替えず、内部の編集状態はappが安定キーに保存する。

pointer移動、明示移動button、取消可能なkeyboard draftは同じ`canMove`境界を使う。アプリがsnapshotと更新/永続化を所有する。公開drag終了イベントがdropより先に発火するため、開始snapshotをmicrotaskでdrop後に清掃する。開始後のsource差替え、範囲外drop、例外となる移動許可は確定を拒否する。Horizontalの折返しはCDKのmixed方式、方向は実祖先のRTLをDirへ接続する。

移動中の取消を`OverlayRegistry`の`operation`として同じstackに登録する。[ADR 0001](0001-overlay-escape.md)の子優先/bubble/IME契約を維持し、document captureでキーを奪わない。取消後は同期でentryを外し、次のEscapeが親Dialogへ届く。popupを開いた場合は新しいpopupが先にキーを処理する。operationに外側pointerによる終了はない。scope喪失/破棄時は登録を清掃する。pointer取消は更新の公開を止め、指を離して操作を終了する説明を残す。アプリの通信取消は保証しない。

## 生成・更新・制限

生成Angular consumerにも`@angular/cdk`、Angular、RxJSが必要。exact依存は正本packageとlockに固定する。配布時はMIT noticeを保持する。CDK更新、Angular major更新、shadow DOM/別document/SSR、可変高さ導入時はこの判断を再検討し、AOT/strict template、実pointerとnative代替、touch cleanup、RTL/profile、入れ子Escape、1000行の終端/DOM数/所有focus、Listboxの実AX所有関係を再検証する。読み上げ/OSタッチの実機認証やbackend成功を型検査から主張しない。

bundleの最小consumer比較は段階の検証記録に残す。prototypeの総bundleやCDK入力sourceのバイトを「追加bundle量」と扱わない。問題が残る場合は完了判定を保留し、公開CDK APIのadapterを差し替える。

参照: [CDK scrolling](https://material.angular.dev/cdk/scrolling/overview)、[CDK drag/drop](https://material.angular.dev/cdk/drag-drop/overview)、[APG Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)、[ARIA aria-owns](https://www.w3.org/TR/wai-aria-1.2/#aria-owns)（2026-10-06に確認）。

採用時の実測は[一覧12要求の検証](../verification/ui-library-collections-2026-10-06.md)に保持する。最小consumerのJS差分はraw257172B/gzip62795Bで、一覧adapter・Forms・CDK・共通コードを含む。公開module直接importとbarrelの保持挙動を区別し、自動tree shakingを保証しない。CDKの公開viewport.elementRef.nativeElement.clientWidthから所有する仮想行の幅を測定するadapterにより、320px/200%の長いラベルとprojected editorを収める。CDK内部DOM/CSSはpatchしない。
