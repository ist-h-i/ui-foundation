独立 public consumer / Foundation・Media の source と実測証拠 pack です。結論は review-final.md と evidence/final-review.json に保存します。

最終 Source commit: a808a79dc5f17c1b87280c2881147c8ab5357a9f
Canonical generation input SHA256: f8df0204a162c19bd77b3c448e6bf3a65de66413870f12c32daec5846fd8da19
Root freeze manifest SHA256: 82388e8eea2aae64a422cf86a168c08d5a9b798bd290b8d70776309e80b49b9a

consumer.ts / tsconfig.consumer.json は公開 barrel のみを使い include consumer.ts 一つで本番 AOT を行う最小 consumer です。用途別6 route と独立 Card 検証 route を含みます。全181部品を一つの業務画面へ配置する設計を要求していません。

raw src/templates/skills/examples、正確な package/lock、通常CLIの生成物 .ui/.agents、clean production dist、各配信資産、実 compile/native/HTTP結果、元findingと補修後の証拠、actual画像確認、最小回帰test/patchを含みます。node_modules と Git は含みません。46直接依存は installed-exact.json、25runtime engine + @types/qrcode/TypeScript は利用ガイド、全固定依存は package-lock.json が正本です。

直前60cd513e/input338dcf85の scoped APPROVE と原native 23+Media2+Scheduler2は snapshots/frozen-338dcf85-60cd513e に保存しました。最終 product は Card CSSの1置換だけ変更され、他138 Angular source・設定・依存・資産が同一です。evidence/evidence-inheritance.json がファイルごとのSHA、旧consumer六routeのbyte一致、Cardがpublic barrel以外の旧componentから参照されないことを検証します。旧native証拠のsource/inputを最新へ書き換えていません。最新sourceでは通常CLI、公入口AOT/negative8、cleanbundle、sourceclosure139、main/private/own exactness、Card native、7route smoke、HTTP231の追加実行結果を保存します。SSR scope trapと旧visualも継承証拠として区別します。

native-observed-consumer.ts は当時のconsumer byteと保存済native SHAを実照合した再現入口です。後のharness変更はMarkdown sample h1→h2と独立Card routeの追加だけです。最終smokeでspecialist文書h1が一つであることを実検査します。

最終再現: finalize-input.mjs → verify-types.mjs → build-consumer.mjs → verify-source-closure.mjs → serve-consumer.mjs（127.0.0.1:5343）。別端末から verify-card.mjs / inspect-browser.mjs / verify-distribution.mjs。既存全nativeを再現する場合は verify-browser.mjs / verify-media-locale.mjs / verify-scheduler-locale.mjs。finalize-input.mjsは所有directoryでのみ動き、readonly原本を第一引数へ渡せます。原main/freeze照合スクリプトはレビュー環境の元パスを使います。未配布の元pathへ依存する継承台帳はsnapshotを含めて検証できます。

利用ガイド: deliverable-docs/docs/ui-library-consumer-guide.ja.md
SHA256: 3f54fad40b11bcdb42b2bd412858c69efc5204afd2fb6facec9d68aecf2168be
自己作者の文書なので独立source承認と分けています。docs/ はreadonly原本の参考snapshotで、canonical製品入力比較からは除外しています。

APPROVEは独立public consumer / Foundation・Mediaと追加Cardの記載範囲です。rootの全npm検査やPR/mergeは別担当です。全181部品全状態のnative、fullSSR/hydration、他browser/OS/AT、backend保存・実upload・Undo、font再compile/PGP、CSP enforcementは未観測です。axe incompleteを保持しています。共有Git/生成物の編集・npm公開・第三者への送信はこのレビュアーから行っていません。

before-fix/frozen/snapshot/harness-orderは当時の結果を保持し、未実行の合格へ変えません。negative compile exit1は期待した診断です。旧全体npm中断/旧Dates契約assert失敗はrootの別結果で、このconsumer APPROVEへ加算しません。
