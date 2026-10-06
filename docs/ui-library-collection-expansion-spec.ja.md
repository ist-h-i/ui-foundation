# 一覧・選択・仮想化・移動の受入仕様

原文と全要求は[依頼原文](ui-library-request.ja.md)と[マトリクス](ui-library-matrix.json)。この段階はforms-18/21、data-01/02/04/05/06/07/10/11、foundation-04/06の12行。Tree、予定、表、媒体、専門部品と残基盤は別段階でも追跡し、削除しない。

利用者は候補/記録を確認して選択・移動・検索し、長い一覧の続きへ到達する。失敗/追加取得の終端と0件を区別する。検証workspaceには対象操作だけを配置し、業務画面への全部品強制配置はしない。HTTP/永続化/実Undo/安全な移動範囲とデータ更新はアプリの責任。

- List/ListItem: native list、安定キー、補助情報、意味icon、型付き行templateとnative行操作、区切り/余白。同じ行の入力を不要に再作成しない。
- Listbox/SelectionList: 単一/複数CVA、検索、group、選択上限、全可視選択、個別不可、APG manual selection。矢印/Home/End/文字検索/Space、IME、同一activeの再選択、検索後のhidden選択保持、不正復元値の説明とapp resetを確認する。group仮想化は実AX treeで描画済optionだけの所有関係を検証する。
- VirtualList: CDK固定高さ、表示領域/行高/先読み/実scroll位置、range/position出力。1000行を小さな実DOMで表示し、Home/End/PageUp/Down、端、profile/200%再測定、破棄と所有focusを観測する。native geometry変更で旧content高さによる一時scroll clampを位置保持へ採用せず、最後の安定した論理先頭indexを、新しい行高で復元する。末尾は表示領域の物理上限内に収める。編集stateはキーに接続したappが保持する。
- Masonry: CSS columnsとbreak-insideで異なる行高を配置。列数/間隔/最小幅/幅別指定、DOM順、320px/200%/RTLを実描画する。
- DataView: 同じ行DOMのlist/grid、実検索/自然ソート/ページとtyped app-owned state。機能OFFでは保存条件を適用せず、未使用pager設定を拒否しない。範囲外のpageは補正stateをアプリへ公開。template indexは絞込後の絶対index、pageIndexはページ内index。
- SortableList/OrderList: pointer/touch handle、上下/前後button、keyboard draft/Enter確定/Escape取消、移動可能範囲、source差替え、連打、破棄、RTL、親DialogでのEscape順を確認。指定した許可callbackはtrueだけを許可し、false・undefined・例外では更新しない。source差替え取消後は、終了/drop後のepoch microtaskで所有CDK dragを公開reset()により清掃し、モデル・DOM順と実矩形の一致を検証する。keyboard draftによる行移動でnative handleのfocusがBODYへ落ちた場合だけ、描画後に同じhandleへ戻す。
- TransferList/PickList: 左右検索/複数選択/一括左右移動、可視scopeとhidden選択保持、選択先の順序変更、pointerとnative代替、無効/上限/失敗。不正CVA値を黙って消さず、明示resetで修復する。
- InfiniteScroll: 実IntersectionObserverと明示追加/再試行、取得状態/error/終端、requestId、reset/破棄後の旧ack拒否、同一versionの自動再要求抑止、追加後のvisible sentinel継続。contentVersionは実際の項目追加/カーソル進行時だけアプリが変更する。要求IDは恒久・別bundle間一意を保証しない。同じ要求を出したhostへ応答し、通信取消や取得成功を部品で先取りしない。
- Timeline/ActivityLog: 明示日時/timeZone/Intl、種別、native details、typed details templateと追加取得。入力保持、失敗と再試行、追加終端、旧host応答を確認する。

基盤/依存の判断は[ADR 0002](adr/0002-collections-cdk.md)。設定・template・生成Skill・consumer依存・demo・検証を一緒に更新する。受入は静的/純モデル→生成consumer AOT→実Browser/AX/axe/描画→新しい独立レビュー→固定HEAD全npmの観測で判定する。未実行、名称登録、汎用wrapperだけではverifiedにしない。
