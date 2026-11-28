# DADS部品一覧とui-foundationの対応（#72）

[DADS β版 v2.18.3の公開一覧](https://design.digital.go.jp/dads/components/)と各部品の概要を2026年11月28日に照合した。ui-foundation側の基準はmain `bd49e07fba0dc1eb2e0f724742f402b680cdd9b1` の[公開入口](../templates/angular/index.ts)、[部品一覧](components.ja.md)、[要求マトリクス](ui-library-matrix.json)。以下は採否と適用条件の記録。共通の部品を優先し、DADSの外観や固定値の移植に伴う別のトークン体系は設けない。

| DADSの部品 | 採否・担当 | 対応と適用条件 |
| --- | --- | --- |
| [アコーディオン](https://design.digital.go.jp/dads/components/accordion/) | 維持、#73 | `Accordion`に同種の見出しを並べる。重要情報は露出し、単独の補足は`Disclosure`を選ぶ。 |
| [イメージスライダー](https://design.digital.go.jp/dads/components/image-slider/) | 維持 | `Gallery`で同じ主題の画像を手動で移動する。個々の画像の代替テキストを用意し、拡大・詳細は`ImageViewer`へつなぐ。 |
| [インプットテキスト](https://design.digital.go.jp/dads/components/input-text/) | 改善、#71 | `TextInput`または`FormField`と`FieldControl`。入力単位ごとにラベルを付け、日付などは用途に適した入力を選ぶ。 |
| [引用ブロック](https://design.digital.go.jp/dads/components/blockquote/) | HTMLで対応 | 引用に`blockquote`を使用する。本文の強調には通常の見出しや段落を使う。 |
| [カード](https://design.digital.go.jp/dads/components/card/) | 維持、#69・#73 | `Card`は単一の主題をひとまとまりにする。行で比べる対象は`List`、列で比較する値は表を選ぶ。 |
| [箇条書きリスト](https://design.digital.go.jp/dads/components/list/) | HTMLで対応 | ただの列挙は`ul`と`li`。順序自体に意味がある手順には標準の`ol`を使う。 |
| [画像](https://design.digital.go.jp/dads/components/image/) | 維持 | `Image`または`img`。重要事項を画像だけで提示せず、必要に応じ`figure`と`figcaption`を組み合わせる。 |
| [カルーセル](https://design.digital.go.jp/dads/components/carousel/) | 条件付きで維持 | `Gallery`（別名`Carousel`）は関連画像の閲覧に使う。必読情報と主要な操作は外に置く。汎用バナーカルーセルは採用しない。 |
| [緊急時バナー](https://design.digital.go.jp/dads/components/emergency-banner/) | 専用化は保留 | 緊急情報の掲載範囲、解除と優先順位は運営アプリが決める。既存`Alert`をページ上部に配置できる。生命・財産に関わるサイト全体の緊急掲載は運用要件がある場合に設計する。 |
| [検索ボックス](https://design.digital.go.jp/dads/components/search-box/) | 合成、#73 | `SearchInput`と結果領域、複数条件は`SearchPanel`と`FilterChips`。検索中も条件を確認・修正できる構成を優先する。表だけの絞り込みは表の操作に置く。 |
| [コンボボックス](https://design.digital.go.jp/dads/components/combobox/) | 維持、#71 | 多い候補を検索する場合に`Combobox`。少数なら`RadioGroup`や`Select`、候補のない自由入力には`TextInput`。 |
| [スイッチ](https://design.digital.go.jp/dads/components/switch/) | 維持、#73 | 即時適用は`Switch`。後続の保存で確定する入力は`Checkbox`または`RadioGroup`。非同期処理は確定した状態を読み戻す。 |
| [水平メニュー](https://design.digital.go.jp/dads/components/horizontal-menu/) | 維持 | サイト内の目的地には`Navigation`のリンクを使い、コマンド群は`Menubar`を使う。狭幅では折り返しまたはモバイルメニューに切り替える。 |
| [スクロールトップボタン](https://design.digital.go.jp/dads/components/scroll-top-button/) | 新設しない | DADSで非推奨。固定ボタンで本文を覆う構成を避け、標準のHomeキーや必要な対象への目次リンクを優先する。 |
| [ステップナビゲーション](https://design.digital.go.jp/dads/components/step-navigation/) | 追加、#72 | 複数画面にまたがる進行表示は`StepNavigation`。現在位置、状態、移動可能性を分ける。単なる待機には進捗部品を使う。 |
| [説明リスト](https://design.digital.go.jp/dads/components/description-list/) | 維持 | `Descriptions`は項目名と値の組を示す。複数項目の同じ属性を比較する場合は表を使う。 |
| [セレクトボックス](https://design.digital.go.jp/dads/components/select/) | 維持、#71 | `Select`で限られた場所に択一選択を置く。少数で比較が重要な選択肢は`RadioGroup`で見せる。 |
| [タブ](https://design.digital.go.jp/dads/components/tab/) | 維持 | `Tabs`と`TabPanel`で同じ主題の観点を切り替える。検索条件や手続きの順番をタブの選択状態へ置き換えない。 |
| [チェックボックス](https://design.digital.go.jp/dads/components/checkbox/) | 維持、#71・#73 | `Checkbox`を後で保存する同意・複数選択に使う。全選択は対象範囲と一部選択の状態を明示する。 |
| [チップタグ](https://design.digital.go.jp/dads/components/chip-tag/) | 維持 | `Tag`、`TagInput`、`FilterChips`で選択済みの条件を表示し、外した条件は再選択できるようにする。 |
| [チップラベル](https://design.digital.go.jp/dads/components/chip-label/) | 維持 | 非操作の`Tag`やテキストを使用し、状態は語句でも識別できるようにする。件数には`Badge`を使える。 |
| [注釈ブロック](https://design.digital.go.jp/dads/components/notice-block/) | 合成、#72 | 読み順に補足と見出しを置く。独立した補足は名前付きの`aside`、入力条件は`FormField`、任意の折り畳みは`Disclosure`。 |
| [ディスクロージャー](https://design.digital.go.jp/dads/components/disclosure/) | 維持 | `Disclosure`または`details`で単独の補足を開閉する。必須の制約や障害を内部に隠さない。 |
| [ディバイダー](https://design.digital.go.jp/dads/components/divider/) | 維持 | `Divider`はグループ間の区切りに使い、見出しで所属を示す。 |
| [テーブルコントロール](https://design.digital.go.jp/dads/components/table-control/) | 合成、#70・#73 | `TableToolbar`、`ColumnFilter`、`ColumnChooser`、`Pagination`。列の操作、絞り込み後の全件、選択中の行を区別する。 |
| [テーブル／データテーブル](https://design.digital.go.jp/dads/components/table/) | 維持 | `DataTable`または`DataTableView`で行・列を比較する。編集・仮想化は要件がある場合に`DataGrid`、`VirtualDataTable`を選ぶ。 |
| [テキストエリア](https://design.digital.go.jp/dads/components/textarea/) | 改善、#71 | `Textarea`と補足。想定の入力量に合わせた初期サイズと、狭幅でも編集できる上限を保つ。 |
| [ドロワー](https://design.digital.go.jp/dads/components/drawer/) | 維持、#73 | `Drawer`はナビゲーションや任意の補助領域に使う。重要な手続きは本文、破壊操作の確認は`ConfirmDialog`を選ぶ。 |
| [ノティフィケーションバナー](https://design.digital.go.jp/dads/components/notification-banner/) | 合成、#73 | 持続する案内は`Alert`、フォームの修正先には`FormErrorSummary`。進行中や部分障害は対象領域の`AsyncRegion`等で示す。 |
| [パンくずナビゲーション](https://design.digital.go.jp/dads/components/breadcrumb/) | 維持 | `Breadcrumb`はサイト階層と現在地に使う。手続きの進行位置は`StepNavigation`へ分ける。 |
| [ハンバーガーメニューボタン](https://design.digital.go.jp/dads/components/hamburger-menu-button/) | 合成、#72 | 短いテキスト付き`ActionControl`で`Drawer`を開く。表示状態と関連付け、閉じた後はトリガーにフォーカスを戻す。 |
| [日付ピッカー／カレンダー](https://design.digital.go.jp/dads/components/date-picker/) | 維持、#71 | `DatePicker`や`Calendar`は候補日を見ながら選ぶ場合。既知の日付には直接入力経路を確保する。 |
| [ファイルアップロード／ドロップエリア](https://design.digital.go.jp/dads/components/file-upload/) | 維持 | `FileUpload`（別名`Dropzone`）と`UploadList`。キー操作で選択でき、選択・送信中・確定結果を区別する。 |
| [プログレスインジケーター](https://design.digital.go.jp/dads/components/progress-indicator/) | 条件付きで維持、#73 | 数値が分かる進捗は`ProgressBar`。不明なら`Spinner`や`AsyncRegion`。既存内容は可能なら保持し、`Skeleton`の常用は避ける。 |
| [ページナビゲーション](https://design.digital.go.jp/dads/components/page-navigation/) | 合成 | 一覧のページ切替は`Pagination`、本文の前後移動はリンクを使う。前後のリンクがない端では、一覧の状態も分かるようにする。 |
| [ヘッダーコンテナ](https://design.digital.go.jp/dads/components/header-container/) | 合成 | `PageFrame`のヘッダーに`Navigation`と必要な補助リンクを配置する。狭幅では本文の開始を覆わない。 |
| [ボタン](https://design.digital.go.jp/dads/components/button/) | 改善、#70 | 実行は`ActionControl`、移動は`ActionLink`。主副の強調度と危険性を分け、操作内容と対象を文言で示す。 |
| [ボトムナビゲーション](https://design.digital.go.jp/dads/components/bottom-navigation/) | 互換維持 | DADSで非推奨。既存の`BottomNavigation`／`Dock`は保持する。新規画面の既定は上部のナビゲーション。固定時は読順・フォーカス・モバイルの操作領域を検証する。 |
| [見出し](https://design.digital.go.jp/dads/components/heading/) | 改善、#69 | `Typography`のHTMLレベルを文書構造で決め、見た目の役割はプロファイルのトークンで選ぶ。 |
| [メガメニュー](https://design.digital.go.jp/dads/components/mega-menu/) | 維持 | `MegaMenu`でまとまったリンクを開く。ホバーだけで開かず、狭幅では`SideNav`などで必要な階層に到達できるようにする。 |
| [メニューリスト](https://design.digital.go.jp/dads/components/menu-list/) | 合成 | ページ移動は`Navigation`や`SideNav`のリンク。コマンドにはキーボード操作を備えた`Menu`。 |
| [メニューリストボックス](https://design.digital.go.jp/dads/components/menu-list-box/) | 合成 | `Disclosure`または`Popover`で移動先を開く。コマンドのポップアップは`Menu`、フォーム値の選択は`Select`。 |
| [モーダルダイアログ](https://design.digital.go.jp/dads/components/modal-dialog/) | 維持、#70・#73 | `Dialog`、`ConfirmDialog`を用いる。補足や成功通知を伝えるだけなら本文・ステータスを使い、現在の操作を中断しない。 |
| [目次](https://design.digital.go.jp/dads/components/toc/) | 改善、#72 | `AnchorNavigation`にoptional childrenと可視ラベルへの参照を追加する。見出しの文言を使い、必要な深さまでに絞る。 |
| [モバイルメニュー](https://design.digital.go.jp/dads/components/mobile-menu/) | 合成、#72 | テキスト付き起動操作、`Drawer`、`SideNav`を組み合わせる。浅く整理し、子階層の開き方をそろえる。 |
| [ユーティリティリンク](https://design.digital.go.jp/dads/components/utility-link/) | 合成 | 補助的な移動先をラベル付きのナビゲーションに分け、`NavigationItem`または標準のリンクを使う。 |
| [ラジオボタン](https://design.digital.go.jp/dads/components/radio/) | 維持、#71・#73 | `RadioGroup`で選択肢を比較できる択一入力を作る。任意の場合は未選択の意味と初期値を明確にする。 |
| [ランゲージセレクター](https://design.digital.go.jp/dads/components/language-selector/) | 合成、#72・#73 | 表示言語は`Select`とアプリが管理する`UiLocale`をつなぐ。フォーム内の「希望言語」フィールドと区別する。固定英語ラベルは一律強制せず、表示言語を問わず起動操作を識別できる文言を選ぶ。 |
| [リソースリスト](https://design.digital.go.jp/dads/components/resource-list/) | 合成、#72 | `List`の`CollectionItem`で見出しリンク、状態、補足、独立操作を配置する。操作が複数あるときは行全体をクリック領域にしない。 |

## #72で拡張・合成した公開契約

| 対象 | 採用理由と適用範囲 | 実装・確認経路 |
| --- | --- | --- |
| StepNavigation | Wizardに入力・検証・遷移の責務があるため、別画面をまたぐ進行表示と移動要求は独立した部品にする。Wizardへ組み込むとフォーカス、既存の進行制御、状態導出が重複するため、既存Wizardの表示と契約を維持する。状態ラベルは利用側の翻訳から渡す。 | [公開入口](../templates/angular/step-navigation.ts)、[モデル試験](../tests/model/step-navigation.test.ts)、[操作試験](../tests/ui/navigation-catalog.spec.ts)。Wizardの既存要求 `forms-29` は維持。 |
| AnchorNavigation | 平坦なリンクだけでは見出しの親子関係を読み取れない。既存の同一ページ移動、offset、hash、現在位置、フォーカスを再利用する。狭幅で開閉する場合は`details`を使い、要約に目次の名前を示す。 | [実装](../templates/angular/anchor-navigation.ts)、[実操作例](../tests/fixture-app/navigation-catalog.ts)、[操作試験](../tests/ui/navigation-catalog.spec.ts)、既存要求 `navigation-06`。 |
| 注釈とリソース一覧 | 常時読める補足にライブ通知や専用部品は不要。注釈と一覧は資料の目的、リンク先、状態、操作をHTMLと既存部品で表現できる。選択範囲の管理が中心なら`SelectionList`やネイティブフォームを使用し、一括操作は選択済みの対象範囲を示す。投影型を使い、行用の同種APIを増やさない。 | [実操作例](../tests/fixture-app/navigation-catalog.ts)、[操作試験](../tests/ui/navigation-catalog.spec.ts)、既存のList・タグ・フィードバックの要求を維持。 |
| ActionGroup | 入力の確定・取消は`FormActions`、同列の短い操作は`ButtonGroup`、選択・利用可能幅で変わる表操作は`Toolbar`または`TableToolbar`。共通の強調度と危険性は#70を利用し、業務の意味が異なる部品を一つのAPIへ統合しない。 | [操作部品仕様](ui-components.md)、#70・#71。 |
| 専門部品 | 時刻・地図・可視化・編集・メディア等はDADSに対応がなくても既存の業務要件を持つ。専門部品の入口や依存を目次・段階表示のために読み込ませない。 | [公開APIカタログ](ui-library-api.json)、[要求マトリクス](ui-library-matrix.json)、[スタイル配置](component-style-audit.ja.md)。 |

DADSの全49部品との対応は用途と公開契約の照合結果であり、全49部品の表示・実操作の比較試験は含まない。変更した経路の検証結果はPR #77に記録する。
