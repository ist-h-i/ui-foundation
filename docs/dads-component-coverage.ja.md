# DADS部品一覧とui-foundationの対応（#72）

参照: [DADS β版 v2.18.3 コンポーネント一覧](https://design.digital.go.jp/dads/components/)（2026-11-28確認）。現行main bd49e07fba0dc1eb2e0f724742f402b680cdd9b1 の公開入口とPR #74〜#77の差分を基準とした一次対応表。DADSの公開一覧49項目を対象に、同等部品・合成・実装候補を整理した。名称対応は詳細仕様・実操作・アクセシビリティの同等性を保証しない。各担当Issueで該当仕様・例外・試験を確認する。DADSの外観や固定値は移植しない。

| DADSの項目 | 既存・変更中の部品／方法 | 採否と担当 |
| --- | --- | --- |
| アコーディオン | Accordion、AccordionItem | 既存維持、開閉条件は#73 |
| イメージスライダー | Gallery、ImageViewer | 既存維持、操作と代替テキストを確認 |
| インプットテキスト | FormField、TextInput、FieldControl | #71の改善 |
| 引用ブロック | native blockquote | 部品新設せず、用途・意味構造を#73 |
| カード | Cardと各領域 | 既存維持、不要な入れ子を#73 |
| 箇条書きリスト | native ul/ol/li | 部品新設せず、意味構造を#73 |
| 画像 | Image、ImageViewer | 既存維持 |
| カルーセル | Gallery（Carousel） | 既存維持、自動送りの必要性・操作の確認 |
| 緊急時バナー | Alert/Banner | 合成、全体への通知範囲を#73、実需要がある場合に新設 |
| 検索ボックス | SearchInput、SearchPanel、FilterChips | 合成、#73 |
| コンボボックス | Combobox | 既存維持、#71の入力契約 |
| スイッチ | Switch | 即時反映と保留の使い分け#73 |
| 水平メニュー | Navigation、Menubar | 用途を区別、#73 |
| スクロールトップボタン | ActionControlとアプリのスクロール対象 | 合成、汎用部品新設は保留 |
| ステップナビゲーション | Wizard、StepNavigation（本PR） | 独立表示を追加 |
| 説明リスト | Descriptions | 既存維持 |
| セレクトボックス | Select、FieldControl | #71 |
| タブ | Tabs、TabPanel | 既存維持 |
| チェックボックス | Checkbox、FieldControl | #71 |
| チップタグ | Tag、TagInput、FilterChips | 既存維持 |
| チップラベル | Tag、Badge、native text | 非操作の表示と選択可能なタグを区別#73 |
| 注釈ブロック | Alertのannouncement=off、HelpText、Disclosure | 専用の非通知補足が必要か精査、下記 |
| ディスクロージャー | Disclosure | 既存維持 |
| ディバイダー | Divider | 既存維持 |
| テーブルコントロール | TableToolbar、ColumnFilter、ColumnChooser、FilterChips、Pagination | 合成例#73、操作API#70 |
| テーブル／データテーブル | DataTable、DataTableView、DataGrid、VirtualDataTable | 既存維持 |
| テキストエリア | Textarea、FormField | #71 |
| ドロワー | Drawer、BottomSheet | 既存維持 |
| ノティフィケーションバナー | Alert、ActionFeedback、AsyncRegion | 通知範囲と持続期間を#73 |
| パンくずナビゲーション | Breadcrumb | 既存維持 |
| ハンバーガーメニューボタン | IconButton、Drawer | 合成、名称と開閉状態#73 |
| 日付ピッカー／カレンダー | DatePicker、Calendar等 | #71の入力契約 |
| ファイルアップロード／ドロップエリア | FileUpload、Dropzone、UploadList | 既存維持、選択・送信・結果を区別 |
| プログレスインジケーター | ProgressBar、Spinner、Skeleton、AsyncRegion | #73 |
| ページナビゲーション | Pagination、Navigation | 連続コンテンツと一覧のページングを区別 |
| ヘッダーコンテナ | PageFrame、Navigation | 合成 |
| ボタン | ActionControl、ActionLink等 | #70 |
| ボトムナビゲーション | BottomNavigation | 既存維持 |
| 見出し | Typography、各部品の見出し | #69 |
| メガメニュー | MegaMenu | 既存維持 |
| メニューリスト | Menu、SideNav | 用途を区別 |
| メニューリストボックス | Menu、Disclosure、Popover | 合成、操作意味と開閉を区別 |
| モーダルダイアログ | Dialog、ConfirmDialog、FormDialog | #70、#73 |
| 目次 | AnchorNavigation（平坦な項目） | 階層・狭幅表示の拡充候補 |
| モバイルメニュー | Drawer、SideNav、Navigation | 合成 |
| ユーティリティリンク | ActionLink、NavigationItem、native a | 合成、リンク意味#73 |
| ラジオボタン | RadioGroup、RadioOption | #71、#73 |
| ランゲージセレクター | Select、UiLocale、アプリ管理 | 合成。切替時に入力・要求保持 |
| リソースリスト | List、CollectionItem、Tag、Menu | 独立項目の属性・操作の共通構成を精査 |

## 詳細確認した候補

- [ステップナビゲーション](https://design.digital.go.jp/dads/components/step-navigation/)：手続き全体、現在位置、各段階の状態、許可された移動を区別。現在位置をstatusLabelと独立した文言・順番・aria-currentで表示し、業務遷移はアプリが所有する。待機中は進捗部品を使い、単なるページ前後移動には採用しない。
- [注釈ブロック](https://design.digital.go.jp/dads/components/notice-block/)：任意の補足情報を示す用途。Alertはannouncement=offでも通知部品の契約・操作領域を持ち、HelpTextは補足の軽い表示である。独立した補足を構成する際の非通知コンテナ、見出し、投影、静的検査を精査する。必須入力条件は#71、重大通知はAlertを使う。
- 目次・リソースリストは既存のAnchorNavigationとListの公開契約を確認。階層表示と、行の複数属性・独立操作の必要性については別差分で詳細設計する。

## 次の検証
全49項目の詳細規範・既存実装の回帰検証は未完了。対応表を採否確定・実装の台帳として使用し、採用しない場合は具体的な既存構成と理由を記録する。既存181要求、日英部品仕様、公開入口、生成APIカタログ、スタイル配置、軽量依存、翻訳、実操作検証と整合させる。本資料は開発元の記録でありnpm配布対象外。
