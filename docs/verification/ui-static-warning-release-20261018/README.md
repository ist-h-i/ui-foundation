# UI静的検査の警告分類と取り込み

全122警告を理由・producer・根拠・再確認条件と一対一に分類し、指定ソースの静的検査・単独配布・理由付き分類管理を完成した。最新の通常CLIは201ファイル・10,308検査、確定違反0件、未分類0件、未確認警告122件、理由付き例外334件。分類を理由とする追加例外・警告の抑制は0件。修正を含むコミットから別checkoutで通常テストv4を実行し、全件成功した。

正本は [機械可読台帳](../../ui-warning-reviews.json)、全件の説明は [分類表](../../ui-warning-reviews.ja.md)。22入力と908根拠・92ファイルのhash/anchorを再照合した。全122件のproducer静的証明と任意実行時条件はUnknownのまま保持する。

| 残す理由の分類 | 件数 |
| --- | ---: |
| 公開CSS・継承・上書き | 32 |
| DOM・配置の実測 | 27 |
| 実行時の寸法・構造入力 | 20 |
| 外部描画エンジン | 11 |
| 仮想行とCDKの同期 | 10 |
| 操作検証用の可変入力 | 10 |
| 画像decode・非同期媒体 | 8 |
| 印刷文書の計算済み値 | 2 |
| DOM状態の復元 | 1 |
| 関数の差し替え | 1 |

## 実装

TypeScript・Angular・CSS/SCSSの同じ検査実装をCLIと同梱 `check-ui.cjs` が使用する。policy・解析器・NOTICEを生成先へ含め、取り込み先で検査専用依存を追加せず実行できる。確定違反・設定不備・解析失敗は終了1、未確認警告のみは終了0という契約を維持した。アプリのコードやSassを実行して値を確定しない。

本リポジトリの `npm run ui:check:warnings` は通常の設定・生成一致・静的検査と台帳を照合する。未分類・消滅・重複・理由不足・根拠hash/anchor変更を失敗にし、errorを警告台帳で承認できない。通常の `npm test` に組み込み、正負回帰10件を追加した。

独立レビューで検査器のalias/key/instance分離、DOM style代入と数値演算等を改善し、sourceとコピーCJSに回帰を追加した。仮想行のnative scroll停止点とFirefoxのdisabled差、Editorの文書更新・遅い更新・native選択位置も修正した。公開CSS上書き契約を維持している。

高速Tabは各キーに待機を挟まず、focus・順序・方向・cancel状態・公開range・DOM数を即時に確認する。連続操作後の表示は、最初の測定値を保存して同じDOMと論理identityを追跡する。画面外・遮蔽・置換・識別情報が変わって戻る履歴を拒否する20件の正負回帰を加えた。同じinstanceのA→B→C→D、1040/2064キー、元の寸法許容差・hit判定を保った。

SVG consumerの隔離準備も、正本の静的検査が必要とするtsconfigとfixture全体をコピーするよう修正した。実一時ツリーで入力欠落を再現し、設定が参照する全入力のbytes/hashと公開consumerを確認する回帰を追加した。canonical検査、native全34シナリオ、filter無効化、所有serverの終了処理を維持する。

## 検証

| 検証 | 結果と対象 |
| --- | --- |
| コミット済みファイルだけの別checkoutで通常 `npm test` | v4は終了0。型・設定72・生成23・静的518・モデル247・UI 1,903・SVG 34が全件成功。UIはretry/skip/flaky 0。source・bundle前後変更なし |
| JsonViewerのnative End終端を先に確認する訂正 | 通常のguarded入口でA/B/C/D全4件が成功。3/5列の8測定、元の1px・最小幅・focus・更新/検索のassertionを維持。retry/skip/flaky 0 |
| guarded buildからのradio・疎な行・高速Tab・観測器 | 180/180成功。Chromium・Firefox・WebKit各60、元の120件と追加60件を省略なしで実行。retry/skip/flaky 0 |
| 別runtimeの3ブラウザー検証 | 48/48成功。実行時点のbundleとguarded buildの309ファイルが同一。関連test/driverも不変。新たに48件を実行したという意味ではない |
| 配置・popupの訂正後の通常入口 | 関連72/72成功。全A/B/C/Dと後続assertionを確認 |
| 観測器のDOM正負回帰 | 20件×3ブラウザー=60/60成功。期待されたready・timeout・target-changedをraw添付で照合。build未実行の限定実験として区別 |
| 検証ツール全件 | 65/65成功。718入力が最終候補と一致し、source・bundleの前後変更なし |
| 公開証拠の集計 | 35/35の正負回帰、別担当による16件の実I/O負例と5件のGit blob負例が成功。raw・receipt・scope・固定repository root・時刻・hashの取り違えを拒否 |
| 独立レビュー | 領域ごとの固定snapshotを別担当が確認。詳細は [レビュー記録](review-summary.ja.md) |

180件は `469e142750a4edb5fdb995e3c2542d481774da50` の指定ソースで実行した。その後のソース差分はSVG準備runner・helper・filesystem回帰、別のJsonViewer試験、その台帳参照hashの5ファイルで、アプリ・fixture・cross-browser driverは不変。最終の通常テストは修正を含む `a96f3ec0fae4908cf47be83246b1043f7dc8af26` から別checkoutを作り、元checkoutのnode_modulesへのsymlinkを使わず、固定依存を別コピーして実行した。最終buildの全309ファイルも、180件・48件の実行対象とbyte一致した。

対象bytesは [最終候補manifest](candidate-manifest-v8.json) に固定した。[最終結果](release-results.json)、[通常テストの結果](normal-v4-summary.json)、[実行対象の対応](final-scope-bridge-v2.json)でsource前後と再利用範囲を確認できる。[選択proof](release-proof.tar.gz)は83.7 MBで、[index](release-proof-index.json)の460ファイルと全hashが一致する。[主担当の現物照合](release-proof-verification.json)ではnested snapshot・traceも確認した。v5レビューの固定diffは、元bytesを保った[圧縮patch](review-evidence-recipe-v5.patch.gz)で別収録した。外部CIの登録が空であることをCI成功とは扱わない。

## 履歴と未保証範囲

元の通常テストv2はUI 1871成功・12失敗でSVG未実行、旧広範囲v10は119/120成功・WebKit表示判定1失敗、v11はbuild中断・browser未実行として保持した。独立レビューで見つかった観測器v1のMajorは修正し、別reviewerで再確認した。失敗履歴を成功へ書き換えていない。

通常テストv3はUI 1902成功・JsonViewer Bの1失敗でSVG未実行。Endの開始後に試験が最大位置を書き、2RAF後に8850から8404へ戻ったtraceを保持する。別のinstrumented対照では、元のアプリ手順は再現せず、scripts-freeな同等DOMの3列で同種の末尾表示失敗を確認した。End後に最大位置との差1px以内を確認してから次の操作へ進む手順は3/5列とも最初の1px判定を通った。これはnativeと試験操作の競合を支持する有限の結果で、元の446pxの内部時刻やscrollendイベント完了を証明するものではない。アプリやCSSのscroll方針は変更していない。

WebKitの元の249px中間scroll位置の正確な内部タイミングは未特定。アプリを含まないnative対照で遅れたscroll完了の種類を確認したが、同じ249pxの原因を証明したものではない。今回の180件の54表示観測はすべて初回readyで、待機・拒否経路は別のDOM正負回帰で確認した。

完成の範囲は、指定ソースの静的逸脱検出・単独配布・理由付き分類管理と、記録した有限回帰である。任意の実行時データフロー、全CSS writer/cascade、外部renderer内部、実利用の理解、視覚・アクセシビリティ全体の合格は保証しない。既知の候補が規則に違反すれば引き続きerrorとし、これらの未保証範囲を包括的な例外へ置き換えない。

過去の大きなローカルtrace・一時checkout・比較snapshotは保持する。通常テストに必要だった9 JSONと2 raw reportは [固定fixture](../../../tests/fixtures/static-checks/README.md) へ移し、clean checkoutだけで試験可能にした。初期の906根拠照合記録も履歴として保持し、現在の908根拠と区別する。
