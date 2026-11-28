# UI設計規範の採否と確認項目

2026年11月28日に [親Issue #65の16観点](https://github.com/ist-h-i/ui-foundation/issues/65) とデジタル庁デザインシステム（DADS）β版 v2.18.3を照合した。DADSの文章・画像・実装コードは転載していない。部品単位の実装と動作の証拠は担当IssueのPRで確認する。

## 人間向け記事と配布Skillの照合

2026年11月28日17:11 JSTにSitesの公開版（バージョン3）を取得し、8項目とレビューの問いを配布Skillの参照文書と照合した。記事は設計の判断理由を画面例で説明する。Skillは利用中の公開APIに即して部品を選ぶ条件と、実際の画面での確認方法を示す。取得時の `main` 要素内のHTMLのSHA-256は `5d96d6d2bbc019982954012e68f85b4edcc1159f74c1c318ac299557a9807929`。[UI/UX設計の8つの観点](https://uiux-design-guide.maroneko-tensuke.chatgpt.site)

| 記事の観点 | 配布Skillでの判断と確認 |
| --- | --- |
| [人間中心設計](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#human) | 利用者の目的に沿って作業を分け、操作対象、判断材料、復旧や継続の経路を確かめる。[作業単位](../../skills/ui-development/references/screen-design.md#start-with-a-work-unit) |
| [情報設計・認知負荷](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#information) | 見出しと余白で判断材料を見つけやすくする。同じ属性を比較する場合は表を選ぶ。[トークン設計](../../skills/ui-development/references/token-design.md)・[情報の構造](../../skills/ui-development/references/screen-design.md#choose-information-structures) |
| [言語・マイクロコピー](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#language) | 操作名から対象と結果が分かることを確認する。業務上の文言と翻訳は利用アプリが管理する。[操作の階層](../../skills/ui-development/references/screen-design.md#design-the-hierarchy-and-action-group)・[実装手順](../../skills/ui-development/SKILL.md#implement-the-interaction) |
| [アフォーダンス・シグニファイア](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#affordance) | 遷移にはリンク、実行にはボタンを使う。色に頼らず操作対象と状態を識別できることを確認する。[操作の階層](../../skills/ui-development/references/screen-design.md#design-the-hierarchy-and-action-group) |
| [操作の一貫性](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#interaction) | 公開部品の状態を再利用し、処理中・失敗・確定を実際の要求結果に対応させる。[操作検証](../../skills/ui-development/references/component-checks.md)・[結果の表示](../../skills/ui-development/references/screen-design.md#choose-feedback-from-scope-duration-and-recovery) |
| [ユニバーサルデザイン・アクセシビリティ](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#accessibility) | キーボードでも操作でき、狭幅や文字拡大で判断材料が失われないことを確かめる。並べ替えではキーボードとポインターで同じ操作条件を適用する。[操作検証](../../skills/ui-development/references/component-checks.md)・[画面での確認](../../skills/ui-development/references/screen-design.md#verify-the-design-in-the-app) |
| [可逆性・安全性](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#safety) | 取消や復旧で対処できる範囲を確認し、影響の大きい不可逆操作は対象と結果を確定前に示す。[操作の階層](../../skills/ui-development/references/screen-design.md#design-the-hierarchy-and-action-group)・[実装手順](../../skills/ui-development/SKILL.md#implement-the-interaction) |
| [エラー耐性・部分障害](https://uiux-design-guide.maroneko-tensuke.chatgpt.site/#resilience) | 欠けたデータに依存する結果や操作は、信頼できない場合に限って止める。復旧に必要な情報を示し、独立した領域は使える状態に保つ。今回この条件を明記した。[結果の表示](../../skills/ui-development/references/screen-design.md#choose-feedback-from-scope-duration-and-recovery) |

## DADSとの差分16観点

| 観点 | 採否・担当 | 根拠と例外 | 確認 |
| --- | --- | --- | --- |
| 情報階層 | 修正採用 #69・#73 | 作業名、判断材料、操作、補足の順を見出し・位置・サイズで示す。HTMLの見出しレベルは文書構造から決める。色だけの区別を避ける。 [DADS タイポグラフィ](https://design.digital.go.jp/dads/foundations/typography/)・[見出し](https://design.digital.go.jp/dads/components/heading/usage/) | 画面名と主操作を色なしで識別し、見出し順を確認する。 |
| 近接・整列・余白 | 修正採用 #69・#73 | 同じ判断に使う値と操作を近づけ、別の作業との間隔を広げる。比較表では行と列の整列を優先する。 [DADS 余白](https://design.digital.go.jp/dads/foundations/spacing/) | 長いラベル、狭幅、拡大時に所属が明確か確認する。 |
| 表面・枠・影・角 | 修正採用 #69・#73 | 見出し・余白で区別できるか先に確認し、独立した対象、操作範囲、重なりを示すときに境界や表面を使う。 [DADS 基本デザイン](https://design.digital.go.jp/dads/foundations/)・[カード](https://design.digital.go.jp/dads/components/card/usage/) | 入れ子の枠を省いても行内の操作対象を特定できるか確認する。 |
| 主操作・副操作 | 修正採用 #70・#73 | 作業単位に主操作を通常一つ置く。独立する作業はそれぞれ主操作を持てる。危険性は強調度と独立させる。遷移はリンク、実行はボタン。本文リンクは色に加えて下線等を使い、新しいタブを開く場合はその動作を明示する。 [DADS ボタン](https://design.digital.go.jp/dads/components/button/usage/)・[リンクテキスト](https://design.digital.go.jp/dads/foundations/link-text/) | ラベルと配置から対象、行先、実行結果を説明できるか確認する。 |
| 無効化 | 修正採用 #70・#71・#73 | 訂正可能な入力不備は送信試行後に訂正先へ案内できる。権限不足、処理中、重複実行の防止は維持し、理由と次にできる行動を近くに表示する。 [DADS ボタン](https://design.digital.go.jp/dads/components/button/accessibility/)・[テキスト入力](https://design.digital.go.jp/dads/components/input-text/accessibility/) | 無効な操作が発火せず、キーボード操作でも阻止の理由や訂正方法が伝わるか確認する。 |
| 二値選択・確定時点 | 採用 #71・#73 | フォームの送信で確定する設定や同意はCheckbox。即時適用の設定はSwitchを候補とし、保留・失敗・確定を識別できることを条件にする。 [DADS スイッチ](https://design.digital.go.jp/dads/components/switch/)・[チェックボックス](https://design.digital.go.jp/dads/components/checkbox/usage/) | 確定前後と失敗からの復旧で、見えている値と実際の状態が一致するか確認する。 |
| 単一・複数選択 | 採用 #71・#72・#73 | 少数の選択肢を比較する単一選択はRadioGroup。直接一覧から選べる場合はSelect、検索や遅延取得が必要ならCombobox。複数選択はCheckbox群またはMultiSelectを使う。 [DADS ラジオボタン](https://design.digital.go.jp/dads/components/radio/usage/)・[セレクト](https://design.digital.go.jp/dads/components/select/usage/)・[コンボボックス](https://design.digital.go.jp/dads/components/combobox/) | 選択可能件数、確定済みの値、空結果と取得失敗を区別できるか確認する。 |
| 入力・補足 | 修正採用 #71・#73 | ラベル、入力前の制約、エラーと訂正方法を近くに示す。必要な情報をプレースホルダーだけに載せない。表示幅と値の制約を分け、閲覧には通常テキストも選べる。 [DADS テキスト入力](https://design.digital.go.jp/dads/components/input-text/usage/)・[テキストエリア](https://design.digital.go.jp/dads/components/textarea/usage/)・[日付入力](https://design.digital.go.jp/dads/components/date-picker/usage/) | 入力中も条件を読めて、エラー概要から項目へ移動できるか確認する。 |
| タブ・ナビゲーション・開閉 | 修正採用 #72・#73 | 同じ対象内のパネル切替はTabs、別の対象へ移るにはリンク、任意の補足はDisclosure、長文内は見出しに対応する目次を使う。 [DADS タブ](https://design.digital.go.jp/dads/components/tab/)・[ディスクロージャー](https://design.digital.go.jp/dads/components/disclosure/usage/)・[目次](https://design.digital.go.jp/dads/components/toc/) | 現在地、前の画面への移動、フォーカスと入力保持を確認する。 |
| 手順化 | 修正採用 #72・#73 | 順序と前提条件がある場合に段階を設ける。画面中の進行はWizard、ルートごとの進行は利用版の公開APIを確認してStepNavigationを使う。単一の短い編集に不要な段階を置かない。 [DADS ステップナビゲーション](https://design.digital.go.jp/dads/components/step-navigation/)・[処理進行](https://design.digital.go.jp/dads/components/progress-indicator/) | 移動、保存済み状態、最終確定を区別し、戻っても下書きが残ることを確認する。 |
| 一覧・比較 | 採用 #72・#73 | 属性比較には表、個別の概要と行内操作にはListとCollectionItemを使う。行内リンクと操作のターゲットを分ける。選択範囲、件数、検索条件を見える位置に置く。 [DADS リソースリスト](https://design.digital.go.jp/dads/components/resource-list/)・[テーブルコントロール](https://design.digital.go.jp/dads/components/table-control/) | ページをまたぐ選択と絞り込みが一括操作にどう反映されるか確認する。 |
| ダイアログ | 修正採用 #70・#72・#73 | 判断を終えるまで元の作業を中断する必要がある場合に使う。誤操作の予防と復旧で足りない場合は、影響と対象を示して確定を求める。 [DADS モーダルダイアログ](https://design.digital.go.jp/dads/components/modal-dialog/) | 取消、フォーカス復帰、失敗後の入力保持と再試行を確認する。 |
| 通知・エラー | 修正採用 #72・#73 | 未解決・操作が必要な問題は、該当する範囲で継続して表示する。短時間の通知は消えても操作や復旧に影響しない場合に使う。手続きの補足は本文や名前付きの補足領域に置く。 [DADS 通知バナー](https://design.digital.go.jp/dads/components/notification-banner/usage/)・[注釈ブロック](https://design.digital.go.jp/dads/components/notice-block/) | 一過性の通知が消えても、重要な状態と対応方法を追えるか確認する。 |
| 非同期・部分障害 | 現行維持と確認条件の補足 #73 | AsyncRegionとActionFeedbackの状態契約を維持。独立領域は利用可能に保ち、部分欠損・結果不明・確定した失敗を区別する。専門部品のエンジン・依存条件と原文保持の契約を維持する。 [DADS 処理進行](https://design.digital.go.jp/dads/components/progress-indicator/)・[実行時の規範](../../skills/ui-development/references/ui-library-runtime.md) | 欠損の影響が及ぶ結果や操作を確かめ、再試行しても入力と独立した領域が残ることを確認する。 |
| アクセシビリティ | 現行維持と選択指針の補足 #69・#70・#72・#73 | 照合した色対、読めるラベル、ネイティブ操作・フォーカスを維持する。装飾アイコンは読み上げから外し、操作アイコンには名前と押しやすい領域を用意する。DADSの寸法目安は用途を確認して適用する。 [DADS アイコン](https://design.digital.go.jp/dads/foundations/icon/accessibility/)・[カラー](https://design.digital.go.jp/dads/foundations/color/) | 操作の識別と到達を、配色、キーボード、狭幅と拡大で確認する。 |
| 固定寸法・外観 | 一律移植は非採用 #69・#73 | 用途を表すセマンティックと利用環境のプロファイルで決める。DADSのレイアウト例・視覚値を業務用UIの必須条件にしない。 [DADS ローカルデザインシステム](https://design.digital.go.jp/dads/guidance/local-design-system/) | 既存設定からの生成と、新しい意味役割の指定が両方成立するか確認する。 |

## 英語規範案の反映

- 階層、近接、整列、境界は [token-design](../../skills/ui-development/references/token-design.md) にまとめた。設計時の部品選択は [screen-design](../../skills/ui-development/references/screen-design.md) を必要時に読む。個々の部品の挙動と検証は、既存の公開API、実行時規範、操作検証へ委ねる。
- 作業単位、強調度と危険性、確定時点、復旧の区別を採用した。配置や部品選択はタスク依存とし、静的検査の規則は増やしていない。
- 英語案にあった画面例は、一覧検索・一括処理、詳細、編集、一覧と詳細、運用ダッシュボード、段階手続きに具体化した。登録画面の失敗・再試行・フォーカス復帰は既存の任意Playwright例へリンクした。
- #69〜#72の追加APIは、利用中の版で公開されている場合に使う。既定の旧APIとプロファイルでの利用を引き続き案内する。役割やAPIの個別解説は各PRの日英仕様を正本にする。
- 生成・配布の確認では、導入した版の規範と実装例を列挙し、生成Skillの対応ファイルと照合する。新しい規範の名前を旧版の必須条件に加えない。
