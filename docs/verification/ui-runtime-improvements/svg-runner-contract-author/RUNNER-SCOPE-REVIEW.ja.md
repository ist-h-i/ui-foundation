# 永久 SVG 回帰の実行件数境界

永久 `test:svg-paint` が診断用環境変数で 0 件に絞られる P2 を、runner 1 ファイルだけで修正した。製品 Geometry、公開 consumer、helper、package、依存は変更しない。before `490967fd…`、after `2f12befdfe27b1c2bdef9fae228e289dd498c8722446e19908b0824dd319e698`。候補・元 source・最小 diff の入口は `SOURCE-MANIFEST.json`。旧 source と c7af539/e8cedf2file の採取済み証拠は immutable のまま残す。

作者外 critic は exact native helper に `PAINT_CONFIG=independent-critic-invalid-config` を与え、実終了 0、frame 0、空 stdout、結果 JSON なしを確認した。旧 runner がその step exit を受け入れることは source で確認した。旧 runner 全体を 0 frame のまま完走させた実測とは書かない。元 Geometry の successful 実測を撤回する finding でもない。

new runner は child environment から `PAINT_CONFIG`、`PAINT_ONE`、`SVG_PAINT_EVIDENCE_DIR`、`SVG_CONSUMER_URL`、`SVG_PORT` を除く。native evidence は自身の fresh `work/evidence/`、URL は自身の実 listener、server port は 0 に固定する。利用者の `UI_SVG_EVIDENCE` は採取先として維持する。環境変数を見つけた全関連 driver は source 検索で確認した。

native step の実終了 0 に加え、fresh JSON の存在・rows array・正式 contract 34 条件・34 distinct・allExpected true・各 passed true/runtime errors [] を要求する。canonical sync/check/idempotent/dry-run/build/native の必須 6 step 成功も要求する。これはテストループの実装のコピーではなく、恒久回帰が部分実行や no-case で成功しない境界である。source の before/copy/after byte 照合は保持し、successful/nativeContract/sourceUnchanged を結果に記録する。

作者 fresh hostile 実行は、上記 5 変数を invalid config、single-case、別 output、127.0.0.1:1、5343 として設定した。実終了 0、34/34 全成功、runtime error 0、必須 6 step 全 actual 0、nativeContract 34、source 不変、自身の server 30005 閉鎖。指定された別 SVG evidence には書き込まなかった。node syntax も actual 0。入口は `evidence/after-hostile-env-full34/` と同名 `.log/.exit`、集約は `evidence/FINAL-RUNNER-RECEIPT.json`。

この実行の source 引数は own base9f + Chart857。root 37ecf88 の全入力と同一だとはしない。156 入力の 148 は root と byte 同一、差は CLI/sync、Diagram/Menu/specialist-model、Skill/runtime reference、package scripts の 8。139 製品は 136 が同一。Chart857/Chart40ca、consumer/helper、locale/Angular core、CSS/YAML/roles/dependency lock は一致する。root 37ecf88 の既存実34と critic の18 frame は、それぞれの source scope のまま保持する。比較の全入力 SHA は `evidence/own-vs-root-current-input-vector.json`。

critic は new source の実 AST から child env・spawn env・native result guard を抽出し、保存済み実34を baseline に11対照（baseline成功、zero/33/duplicate/aggregate false/failed/runtime error/errors field missing/not array/step missing/code1 を拒否）を実終了0で確認した。hostile env 除去・自身の URL/evidence/port・host environment の不変も検査した。描画や AOT を模擬していない。`evidence/author-external/runner-scope-after/` と元 zero-frame probe を別に保存した。作者外 source scope の APPROVE を受領した。

root の最終候補へは `candidate/scripts/test-svg-paint.mjs` だけを採用する。既存 package scripts と consumer/helper は維持する。今回の修正は axe incomplete の解消や人の意味理解の保証ではない。共有 source/Git/他の server/browser は編集・停止していない。
