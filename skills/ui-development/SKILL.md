---
name: project-ui
description: Design and implement UI for this project using its persona profiles, two-layer design tokens, generated Angular components and Tailwind theme. Use for UI changes or explicit UI configuration work.
---

# プロジェクトのUI開発

## 最初に読む

生成先では隣の`project-context.md`を読み、利用者の目的、利用状況、制約、default_profile、各profileのguidanceとトークン対応を確認する。このSkillの生成元を変更している場合は`examples/ui.config.example.yaml`と`docs/design.md`を読む。設定は判断材料であり、自然言語を勝手に機械設定へ確定しない。

## 設計と設定

1. 今回の利用者、達成したい判断・操作、端末と利用状況、必要情報を確認する。年齢や役割だけから書体・情報量・操作方法を決めない。
2. 既存の画面と部品を読み、採用するプロファイルを明示する。初期設定で固定するか、利用者が切り替えるかも決める。
3. 必要ならプリミティブの配色/文字/余白の体系と、用途別セマンティックへの対応を提案する。新しい値や体系も作れる。同じ具体値でも役割が違えば意味を分ける。
4. プレビューで目的適合性を比較し、採用する設定をYAMLの正本へ反映する。通常/hover/focus/無効/処理中/エラー/欠損の組合せを確認する。コントラストの数値合格だけで採用を決めない。
5. sync --dry-runで差分を確認し、syncで生成する。生成物を手編集せず、機能コードを生成専用ディレクトリへ置かない。

## 画面実装

生成されたangular部品と、同じセマンティックに接続したTailwind utilityを使う。具体的な色/余白の値やプリミティブを部品・画面から直接参照しない。必要な新しい役割は設定と部品契約へ追加する。

output内のtailwind.cssで生成したテーマを確認する。色はbg-color-action／text-color-on-action、書体はfont-family-body、文字サイズはtext-size-body、太さはfont-weight-bodyのように用途を区別する。余白はpx-control-x、角丸はrounded-control等の役割名を使う。

guidanceと機能の目的から情報階層、構成、補助説明、操作経路を設計する。全部の画面を同じレイアウトへ合わせない。YAMLにDOMや全業務仕様を二重管理しない。

プロファイルは有効なIDを選びdata-ui-profileで適用する。切替時にフォームや取得・実行状態を作り直さない。部品はnativeの意味、見えるfocus、処理中の再操作防止、入力保持、失敗と復旧を保つ。HTTP、業務上の安全範囲、実データUndo、更新重複防止は利用アプリが所有する。

一覧の検索・ソート・ページ・列配置はDataTableViewのTableStateで保持する。server処理ではアプリが状態からデータを取得し、部品は受信行を再処理しない。入力は生成されたCVA部品とReactive Formsを接続し、無効化・reset・離脱時更新・未確定の候補を検証する。非同期候補はqueryとrequestIdで古い応答を除外する。日付はcivil ISO日付、日時は明示タイムゾーン付きのローカル時刻契約として扱い、DST解釈とInstantへの変換はアプリが行う。GridListは実コンテナ幅とsize.grid-itemを使う。Iconは@lucide/angularをインストールしprovideUiIconsで必要なアイコンを登録する。APIの詳細はリポジトリのdocs/ui-components.md、全要求と残件はdocs/ui-library-matrix.jsonを参照する。

Cardは各領域のテンプレート／投影とshow/collapseを接続し、hiddenで入力を保持する。Menuは再帰itemsを使い、親へのfocus復帰とTab退出を保つ。Dialogはnative modal/nonmodalを使い、アプリの終了保留はcloseRequested.preventDefault()で接続する。busyでUI終了を抑止し、完了後はcompleteまたは明示open=falseを使う。通知はautoDismiss=trueなら正のdurationSeconds、falseなら保持。共通NotificationHostでFIFO・同時表示数・重複を選ぶ。modal内の操作付き通知はuiNotificationScopeとその内側のhostを用い、native modalの背景抑止を維持する。確認結果はUIの意思表示であり、保存成功・実Undo・未保存判断はアプリが所有する。

## 検証

checkで設定と生成物を照合し、型検査/ビルド/対象操作試験を実行する。リポジトリではnpm run ui:sync / ui:check / typecheck / test:model / test:uiを使う。利用アプリでは保存されたプロジェクトコマンド、またはcheckoutのsrc/cli.tsをtsxで実行する。checkは全ソースのAST逸脱やUX全体を確認しない。

各採用profileで狭い画面、文字拡大、キーボード、動きの低減、正常/処理中/エラー/欠損/復旧を確認する。描画・操作・自動アクセシビリティ・意味レビュー・利用者確認を分けて報告する。未実行を合格扱いしない。詳細な判断例は必要時に[参照](references/token-design.md)を読む。

配置部品は`docs/ui-components.md`の配置とコンテナを参照する。Gridのbreakpointsはcontainer幅、ResponsiveVisibilityはviewport幅。stickyは直近scroll領域内で作用する。Panel/Accordion/Splitterや領域の非表示で入力を破棄せず、focusを隠れた部分から退避する。必須操作を幅だけで除外するかは利用アプリの目的に照らして判断する。

操作部品は`docs/ui-components.md`の操作部品を参照する。native button/linkと処理中のcapture guardを保つ。Toggleのaccessible labelは状態によって変えずaria-pressedを使う。SegmentedControlは選択方式に応じたCVA値をアプリが用意する。Toolbarは実幅による退避時と復帰時のfocusを確認する。CopyButtonはwriterの成功後だけ成功を表示し、拒否・再試行・表示期限・破棄後の結果を検証する。

通知一覧と状態表示は`docs/ui-components.md`の該当契約を参照する。ActionFeedbackの結果不明、AsyncRegionの部分欠損/古い情報を成功へ置換しない。通知一覧のread/delete/loadMoreと進捗/領域抑止のcancelはアプリへ要求を返し、backend成功を部品で先取りしない。表示切替で入力とfocusを保ち、busyで無効になる操作は状態説明へfocusを残す。Spinnerの遅延、native progressの不定、Skeletonの動き低減、対象だけのinertを実操作で確認する。Tourは実HTMLElementを対象にして非modalで案内し、表示済み/再開/対象喪失/終了復帰を検証する。directive付き要素のqueryはElementRefを明示してnativeElementを渡す。
