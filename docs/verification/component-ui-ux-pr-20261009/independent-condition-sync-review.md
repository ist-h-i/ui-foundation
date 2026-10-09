# 条件復元の試験同期・独立確認

Decision: **適用された同期修正を approve**。これは試験の準備状態に関する確認であり、最終 PR head の承認ではない。

確認時の HEAD は `a6bd7b5c24b3b2a5235d4a3fbc35291eb65271dd`。提案検討後、`tests/ui/async-retry-focus.spec.ts:205–208` への未コミットの適用 diff も直接確認した。コード編集・git mutation・build・sync・試験実行は行っていない。

## Evidence

- `tests/ui/async-retry-focus.spec.ts:203–205` は復元ボタンを押した直後に `#filter-model.textContent()` を baseline として取得し、その後に nested の editor の ElementHandle を待つ。click の完了は Angular の親出力の描画完了を保証しないため、baseline が空の古い表示になる余地がある。
- `/tmp/ui-foundation-pr-20261009/condition-save-failure/trace.zip` の `1-trace.trace` はこれを直接示す。restore click の後の `call@1186` (`textContent`) は `children:[]` を返す。その後、nested editor が存在し、保存待ちの `call@1216` の assertion では money/nested/deep と value「申請」を含む復元済みモデルを観測している。assertion の期待値が古い空モデルなので失敗している。
- fixture の復元処理は `filters.setValue(nestedConditions)` で一つの既定のモデルを設定する。`nestedConditions` は money/nested/deep と word.value「申請」を含む。保存処理は clone した current model を要求へ渡し、pending と snapshot ownership を扱う。失敗 trace に、復元済みモデルを保存により空へ戻した証拠はない。
- `/tmp/ui-foundation-pr-20261009/condition-restore-observations.json` は24行。guided 12回中10回、dense 12回中9回の immediateChildren が描画済み children と異なる。描画後の children は全24回 money/nested、savePreservedRenderedModel は全24回 true。これは初回読み取りの同期不足という説明と一致する。
- 観測 script `probe-condition-restore.mjs` も直接読んだ。モデルと入力欄の web-first assertion の後に native Enter で Save を押し、要求数・保存待ち状態・モデル保持の assertion を通過してから true を記録している。
- 適用 diff は editor locator の宣言、モデルと editor の二つの web-first assertion、baseline/ElementHandle の取得順変更だけ。保存後の比較、失敗・再試行・外部 focus・stale ownership を含む既存 assertion に削除・緩和はない。

## 修正の条件

- `editor` locator を先に宣言し、baseline の `textContent()` と ElementHandle を取得する**前**に、model の `"id": "nested"` と editor の `toHaveValue('申請')` を web-first assertion で確認する。nested の id はたとえば空白を許容する正規表現で確認できる。クリック後の任意の時間待機や試験全体の retry は不要。
- この二つの待機は、アプリ所有のモデル出力と CVA の実入力の両方が復元されたことを確認する準備条件である。以後の baseline とモデル比較はそのまま保ち、保存後に baseline を取り直して合わせたり、モデル保持 assertion を nested の存在だけへ置き換えたりしない。
- 保存失敗・自前 focus 復帰・二重要求抑止・旧結果拒否・外部 focus/scroll 保持・native editor の同一性・外部 reset・disabled・破棄後の ownership の assertion は維持する。この同期追加でそれらを弱める必要はない。
- 今回の実際の aggregate 失敗は記録して保持する。修正後の新しい candidate manifest と完全な aggregate を別実行にするという主担当の方針は適切。

この修正に追加の P0/P1 は確認していない。新しい aggregate の結果と最終 commit は、最終 head のレビューで確認する。
