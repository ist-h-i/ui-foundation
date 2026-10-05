# Card・Menu・Dialog・通知の段階検証

2026-10-05、branch `feat/ui-library-expansion`。基準mainは618ce052。全181行は[要求マトリクス](../ui-library-matrix.json)に保持し、この段階後は44行verified、16行partial、121行pending。全依頼完了ではない。

## 検証結果

Mac/Node24.19/Angular22.2.1/Chromiumで実行した。

- `npm test`はui:check、TypeScript/Angular strictTemplates、設定60・生成15・モデル19・ブラウザー182の全276件が合格。[テンプレート](../../templates/angular/)からの同期後、dry-runは変更なし、checkは一致を確認した。
- `tests/generation/consumer.test.ts`は異なる一時ディレクトリの`foundation`へ生成し、再同期の変更なし、check、AOT/strictTemplates、間違った行プロパティのコンパイル失敗を確認した。`scripts/consumer-browser.mjs`はその生成物だけからproduction modeでbundleして配信し、両profile・320px・文字200%でReactive Forms、Cardの入力保持、再帰Menu、Dialogの入力/終了理由/focus復帰、civil日付、通知操作、登録Iconの描画を実操作した。ブラウザーerror/warningなし。実際の業務アプリへの導入実績とは区別する。
- Cardの5領域は投影とtyped templateで描画し、領域表示・折り畳み・loadingで入力を保持。非表示になる領域から展開操作へのfocus復帰を観測した。
- Menuは3階層、親復帰、RTL、keyboard/typeahead、checkbox/radio、disabled/visible、click/hover/context、閉じる条件、動的な項目削除、親Dialog終了を確認した。triggerは全体の起動、子階層はclick/keyで展開する。狭幅のhover先行展開による誤操作を修正した。
- Dialogはnative modal/nonmodalの切替、slots、終了保留、busy、Escape/outside、位置、pointerとkeyboardの移動/resize、最大化/復元、連続open、confirm/alert/form/dynamicの入力と結果を観測した。FormDialogの保存失敗はfixtureが発生させ、入力保持と再試行後の明示completeを確認した。backendの成功を保証する試験ではない。
- 通知の5秒、OFFの保持、hover/focusが重なったpause/resume、close/action、FIFOの表示開始時点、同時表示数、重複、操作中の置換と古い終了、サービスのclear、modal内通知scopeを確認した。タイマーは純粋モデルとPlaywright clockの前後で検証し、実時計によるOS負荷を含む期限保証とは扱わない。
- 異なるOverlayHostの外側イベントを最上位だけで消費し、異なるNotificationServiceの同じローカルIDがfocus復帰へ干渉しないことを確認した。独立した操作反復でも前者8回、Menu/Comboboxの対象試験16件を観測した。

対象部品のaxeはTable、入力、Overlayの各範囲を明示して検査した。全ソースのAST逸脱検査、全181行の自動検証、利用者理解の合格とは扱わない。ブラウザー試験が重なった際のtimeoutを確認し、fixtureの起動待ちは120秒、以後の同時実行は2 workerに設定した。本通しの実行ログは4 worker。

## 独立レビューと描画

fresh-context reviewerはソースと実ブラウザーを確認し、修正後にOverlay/Menu/Dialog、通知それぞれapprove。native modalの残留、項目削除時のfocus、親終了後のpopup、文字検索の装飾記号、hoverのfocus奪取、通知の入れ子dir/長さ/外部終了/ID競合を再現して修正した。さらに両profileの320px・200%・RTLで通常clickによる3階層と親戻りを独立確認した。

最終画像は[Dialog guided](images/dialog-guided-320-200.png)／[dense](images/dialog-dense-320-200.png)、[通知 guided](images/notification-guided-320-200.png)／[dense](images/notification-dense-320-200.png)、[通知の操作 guided](images/notification-actions-guided-320-200.png)／[dense](images/notification-actions-dense-320-200.png)。長い内容は領域内のscrollで本文と閉じる操作へ到達する。

実OSのtouch/IME、実スクリーンリーダー、Safari/Firefox、SSR/hydration、人による意味レビュー、業務backendとの統合は未評価。showHeader=falseでの移動/最大化はソースとAOTを確認し、独立した実操作は未評価。

## 後続

レイアウト・操作・フォーム・状態表示・ナビゲーション・一覧/ツリー・表の残機能・ファイル/メディア・専門部品と共通drag/drop/virtualization/localeは継続する。[専門部品の候補評価](../ui-library-specialist-assessment.ja.md)を実装済みに数えない。Undo、backend、未保存判断と安全な継続はアプリが所有する。Issueはopen、PRはDraft。merge/npm公開は行っていない。
