# 基本デザインの適用判断

調査対象は [デジタル庁デザインシステムβ版 v2.18.3の基本デザイン](https://design.digital.go.jp/dads/foundations/) と ui-foundation の現行コンポーネント、設定、操作試験です。関連Issueは [#69](https://github.com/ist-h-i/ui-foundation/issues/69) と [#65](https://github.com/ist-h-i/ui-foundation/issues/65) です。

| 確認項目 | 採用する考え方と実装 | 維持する現行契約と適用条件 |
| --- | --- | --- |
| [タイポグラフィと読みやすさ](https://design.digital.go.jp/dads/foundations/typography/) | ページ、節、小見出し、本文、補足の役割を分ける。HTMLの見出しレベルは文書構造で決め、表示は任意のトークンから解決する。 | 見出しの既存の太さと単位なし行高、本文の行高1.6、本文・コードの書体、数値の書式化を維持する。データ比較の値や補足、操作ラベルは用途に応じて既存の役割を使う。フォント資産、数値や文字間隔の一律指定は導入しない。 |
| [余白](https://design.digital.go.jp/dads/foundations/spacing/)・[レイアウト](https://design.digital.go.jp/dads/foundations/layout/) | 近接する要素、項目、節で間隔を区別する。スタート時の両プロファイルで `compact`、`normal`、`wide` を段階化し、Stack・Gridの同じ意味の引数を使う。 | 入れ子のプロファイルは独立して適用する。既存YAMLの値は読込時に保持する。FormLayoutは同じ余白を参照し、フォーム特有のラベル配置や操作群は #71 で扱う。狭幅で並べ切れない項目は折り返し、関連情報を一緒に読める順に置く。 |
| [カラー](https://design.digital.go.jp/dads/foundations/color/) | テキスト、状態、操作、リンク、フォーカス、選択は用途別に設定し、対象の色対を全プロファイルで検査する。 | 既存のパレットと色役割を維持する。実画面では要素境界とフォーカスも確認する。操作の新しい組み合わせは #70 が担当する。 |
| [アイコン](https://design.digital.go.jp/dads/foundations/icon/) | アイコン位置はラベルや内容との関係で選ぶ。ラベル付きの補助アイコンとアイコンのみの操作で読み上げの責務を区別する。 | `Icon`、用途別の登録、`iconPosition` の論理方向と既存の名前付けを維持する。アイコンの図形や位置の追加規格は取り込まない。 |
| [リンクテキスト](https://design.digital.go.jp/dads/foundations/link-text/) | 本文のリンクには色以外の手がかりを添える。リンク名で遷移先を判断できるようにする。 | ネイティブリンクと既存の `color.link` を使う。パンくずとナビゲーションには配置・現在地の手がかりがある。ボタン形式のリンクを含め、用途と背景に応じて対比や下線を確認する。 |
| [境界線](https://design.digital.go.jp/dads/components/divider/usage/)・[角の形状](https://design.digital.go.jp/dads/foundations/corner-shapes/) | 見出しと余白で関係を示し、操作領域や独立したまとまりには必要に応じて境界を使う。 | `border.control`、`border.focus`、`radius.control`、`radius.surface` と既存のDivider、Cardを使う。すべての節をカードで囲まず、配置だけでまとまりが分かる場所には既存のplain表示を選べる。 |
| [エレベーション](https://design.digital.go.jp/dads/foundations/elevation/) | 重なりや操作範囲の違いを伝える箇所で影や背景の遮蔽を使う。 | `color.shadow`、`size.elevation-blur`、`color.backdrop` とオーバーレイの既存の重なり順を維持する。影の段階や新しい列挙型を追加する必要は確認できなかった。 |

## 見出しを持つ部品

| 対象 | 視覚的役割 | HTMLと従来設定での扱い |
| --- | --- | --- |
| PageFrame | `page-title` | `headingLevel` で選ばれた `h1`／`h2` を使う。役割を省略した旧YAMLでは `text.heading` の値に戻る。 |
| Container・Card、Dialog・Drawer、Popover・ConfirmPopover、MegaMenu | `section-title` | 既定の見出しレベルと投影された見出しを維持する。ヘッダーの折り返しに用いる幅の計算も同じタイトルサイズへ合わせる。 |
| Alert・EmptyState・ResultState、NotificationCenter、WizardStep、Tour、Scheduler | `section-title` | 組込みの見出しと通知の意味を保つ。WizardStepの `h3` やScheduler内のイベント見出しのレベルも維持する。 |
| Typographyの `heading` と省略時、Statisticの数値 | `heading` | 既存表示を維持する。意味に応じて新しい役割を使う側が明示する。 |
| 投影コンテンツ、一覧セルや操作ラベル、補足・説明 | 既存の本文・補足・操作ラベル用の役割 | アプリが所有する見出しはアプリでレベルと視覚的役割を選ぶ。境界線や影に見出しの構造を任せない。 |

公開クラスとグローバルCSSの入口は維持します。見出しの表示は担当部品のスタイルに置き、共有する意味トークンだけを生成物から参照します。Tailwindのテーマには同じ役割を公開します。固定値やDADSの資産は取り込んでいません。

検証には `tests/config/config.test.ts`、`tests/ui/display-catalog.spec.ts`、関連するレイアウト・オーバーレイ・Wizardの実操作試験を使用します。書体や間隔を利用アプリが変えた場合の読みやすさ、色の見分け、操作への到達性は実際の画面で確認します。
