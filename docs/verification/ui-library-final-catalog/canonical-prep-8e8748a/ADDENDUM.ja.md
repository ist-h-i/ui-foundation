8e8748a の正本証拠マップを、以前のpackを変更せず追加しました。

48要求・207制御項目の実装参照はそのままです。media-04/06/07/10の4件の正式試験参照だけを、採用済み `media-regressions.spec.ts` のSHA3e3b320へ更新しました。全209参照（実装115、正式試験94、unique88）のpath/SHAを、private originalの名前ではなくGit8eと共有実物に照合しました。差分は0です。foundation-07/08の正式参照は、前回訂正した `foundation-date-format-retention.spec.ts` を維持します。

8eのfreeze274件はGitと実物に一致します。製品139件は承認済みa808からbyte変更なしです。53のfreezeからの変更は、独立に承認したMasonryとMediaの2正式specだけです。原文181要求（172表行＋9基盤）のID・順序・種類・名前・requestedControls・sourceLineを保持し、原文SHA7a0も不変です。現在matrixは133verified、37pending、11partialのままです。

旧53全npmは実exit1、UI977成功・3失敗です。元94capture entriesをSHA照合して保持しています。8eの正本fixtureでの対象5件は実exit0、skip/retry/flaky0、sourceChanged[]でした。この対象成功を、新しい全npmの成功へ置き換えません。

Lightbox第二レビューの実行範囲を明確にします。作者の4/4は、正式候補specを既存の自分のpublic consumerへ適用した実行で、root fixture全体のbyte一致cloneではありません。製品139/config/lock/正式specの一致と、原トレースの復号根拠は有効です。正本fixtureでの成功は、今回のroot selected5を別証拠として記録します。旧second-review packは変更せず、この追記で曖昧さを解消します。

Consumer guideはGit8eと実物のSHA3f54が同一で、以前の独立全文レビューを継承できます。新たな製品・試験・生成物の編集、browser/server起動は行っていません。

現在の判定はPREP_CHECKS_PASS_FINAL_APPROVAL_PENDINGです。全npm8eの実終了成功、最終matrix/docs commit、その実物と証拠の整合レビューを待ちます。全181・最終文書・全体完了への承認はfalseを維持します。
