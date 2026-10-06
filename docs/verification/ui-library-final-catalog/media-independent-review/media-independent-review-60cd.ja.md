媒体11要求の独立判定は **approve**。対象コミットは `60cd513e86099dffc756c10402a5262f466a34d0`、製品の未解決findingはありません。原文の各controlと実測の対応は [media-control-coverage.json](media-control-coverage.json)、判定・実行数・範囲は [media-independent-verdict.json](media-independent-verdict.json) に記録しました。

レビュー担当 `/root/prepare_responsive_gauge` は先のChart5 geometryの作者です。この判定の範囲は `media-01`〜`media-11`。媒体製品sourceへの編集は0件で、製品修正と最終統合は `/root` が所有します。担当が変更したのは隔離public consumer、検証decoder、native probe、検証資料です。全181要求の最終判定・マージ判断は親の統合レビューへ渡します。

最終freezeは `root-message-final-source-freeze.json` のSHA256 `6f3fd8b26d7e4f4ba65eb7aa58c0d29b7491bf566e263b3d4006049a56f00d12`。canonicalは273/273ファイルがfreezeに一致し、隔離側の139テンプレートも全件一致しました。source vectorのSHA256は `a9b47ba685dcf423e88f0ba69d6e4d0c92af57d347aebc500bd59e223265a368`。媒体13sourceの個別SHAと実sourceは [media-source-sha.json](media-source-sha.json)、全件guardは [final139-freeze-audit.json](final139-freeze-audit.json) にあります。ImageCompare/Galleryは `7ef49ad34d15b3022271086cdd8a6e9a784688183549b20d9daf917db2d4971c`、Barcodeは `5ee83be6fd64f76bf0819e1403f491d5f71638254b7e8ee31864e7b6ed6d25a9` です。

隔離consumerでは媒体の全importを公開barrelにまとめ、Dropzone/AttachmentList等のaliasも型検査に含めました。生成物の手編集はありません。正規 `ui:sync`・`ui:check`・strict TypeScript/Angular AOT型検査は各exit 0。[静的実行記録](evidence/final139-static-exits.json)、[最終139 sourceのemitted AOT build](evidence/final139-build-exit.json)、[媒体候補の実測前build](evidence/barcode-final-build-exits.json)を保存しています。最終freezeで追加されたScheduler sourceは媒体scope外であり、媒体13sourceは実測時から変わっていません。

正式Media試験はpublic consumer上で **18/18、exit 0、retry 0、skip 0**。FileDraft/owned-message-stateのpure modelは **5/5、exit 0**。[正式18件の個別状態](evidence/final-formal-case-statuses.json)、[正式raw JSON](evidence/final-formal-media-results.json)、[model log](evidence/after2-model.log)を参照してください。

追加nativeはguided/denseそれぞれの1280px LTRと320px・文字200%・RTLの4条件で行いました。public controls 4条件、辞書のlive切替4条件、Compare実座標とGallery axe 4条件、実タッチBarcode 2条件を独立採取しました。[public controls](evidence/independent-controls-final4/observations.json)、[live切替](evidence/final-live/observations.json)、[座標・Gallery](evidence/compare-plane-final2/observations.json)、[実タッチ・AX](evidence/barcode-touch/observations.json)がraw記録です。

| 原文の要求 | 実装と操作の実測 |
| --- | --- |
| media-01 FileUpload: 形式、容量、件数、進捗、取消、再試行 | 実File/native picker、形式・容量・件数拒否、null/40%進捗、取消/retry。mixed拒否では既存CVAの同一array・同一Fileを保持し、pickerは空に戻る。retry後の旧id/requestId応答をアプリが棄却。 |
| media-02 Dropzone: ドロップ受付、複数ファイル、受付条件 | 公開ui-dropzoneをFormControlへ組込み。DataTransferによるdrop受付、複数Fileと受付条件、native pickerによる操作代替。OSからの実dragは実施していません。 |
| media-03 UploadList/AttachmentList: ファイル情報、進捗、個別失敗、削除、再試行 | 公開ui-attachment-listで名称・容量・状態・個別失敗を表示。native Enterで取消/削除/retry、retryでid/File保持・requestId更新、削除後focus復帰。 |
| media-04 FilePreview/PDFViewer: 表示対象、ページ、拡大、ダウンロード | 実PDF.js workerがcanvasを描画しdark pixelを確認。URL/Blob/Uint8Array、2ページ、200%zoom、急速変更、native本文details、元PDF856bytesとSHA、失敗・再試行・worker終了。named局所scrollのキー操作も実測。 |
| media-05 Image: 代替説明、縦横比、収め方、取得失敗、遅延読込み | native alt/ratio/object-fit/lazy、実不正URLのload失敗とsrc変更で復旧。辞書に同名keyがあってもアプリ提供altを保持。 |
| media-06 ImageViewer/Lightbox: 拡大、回転、前後移動、閉じる | 実Dialogのfocus出入り、前後移動、native rangeで400%zoom、90度回転、Escape終了。広幅/狭幅の両profileで回転画像の四隅へ局所scrollで到達。 |
| media-07 Gallery/Carousel: 項目、移動、ページ表示、自動送り、間隔、停止 | 項目・ページ・native pointer/key/touch。browser clockで350ms間隔を確認。focus pause/manual Stop、hidden/disabled/reduced-motion/destroy、live role説明。picker role=groupの再axe判定を採取。 |
| media-08 ImageCompare: 比較方向、境界位置、操作 | horizontal/vertical、Home/End/矢印、実pointer .2/.8。画像のphysical座標とnative range/lineの一致、RTL周囲とrange LTRの共存を両profileで測定。値・focus・DOMを保持したlive error/valuetext切替。 |
| media-09 ImageCropper: 切抜き範囲、比率、回転、確定 | 実pointer dragと数値入力の操作代替。160×80 sourceから80×40 PNG、赤/黄pixelとsourceBoundsを検査。比率1・90度回転で80×80。旧Bitmap close、hidden/source/destroy後の保留Blob失効、アプリURL revoke。 |
| media-10 AudioPlayer/VideoPlayer: 再生、停止、音量、速度、字幕、全画面 | 実WAV再生、Stopのpause/time0、volume .25/rate1.5、実VTT mode/cue/同ID src変更、旧play Promiseの所有分離、hidden/disabled停止。実生成WebMのvideoWidth100とplayer領域fullscreen。 |
| media-11 QRCode/Barcode: 内容、形式、サイズ、説明 | QR生ラスタ48件とnativeスクリーンショット4件を独立復号。Barcode8形式×4条件32件を独立復号し、10形式×4条件40件の実白黒ラスタを検査。値・説明・形式・寸法・module幅、原寸400pxのnamed局所scrollをkey/wheel/touchで実測。 |

原文行209〜219と最終commitのspec/Skill/YAMLを[要求snapshot](evidence/final-requirements-source-manifest.json)へ保存しました。canonical matrixのmedia11行は現在も `pending` であり、担当は変更していません。このレビュー結果は別のcoverage JSONに記録しています。

辞書切替では、実不正画像/PDF/File/media sourceで保持中のerror、PDF描画済status、Media停止status、Compare aria-valuetext、Gallery carousel/slide role説明を再翻訳しました。4条件とも追加network request 0、Worker生成差0、Bitmap生成差0、slider67・focus・既存DOMを保持しました。アプリが渡したerror/altはrawのまま保持しています。

ImageCompareの最初の補助probeはnative range更新直後にbboxを読むため失敗しました。最終probeは実lineの描画を待ち、直前の値もraw JSONに残しています。例えばdense広幅のpointerではnative値81に対し直前line .19、描画後line .81でした。製品のRTL座標不一致は、それとは別に修正前PNGと修正後の実point/key測定で確認しています。最終Gallery group・live scope・Barcode touch scopeのaxeは違反0/incomplete0。これらは指定scopeとstateの結果であり、元のaria-prohibited-attr/color-contrast等のincompleteを削除していません。

Barcodeは修正前、狭幅で400pxの符号化ラスタが256/288pxへCSS縮小され、実画面のCode128復号が2条件で失敗しました。[元失敗](evidence/independent-controls-final3/exit.json)と画像を保持しています。修正後はnative画素400pxを維持し、named region/tabindex0でキーボード・wheel・実touchが両端へ到達し、page幅は320pxを超えません。全ラスタと広幅native PNGは復号しました。狭幅の切り取られた単一viewportの全コード復号は保証範囲に含めません。最終specもこの契約を明記しています。

QRではdefault ZXing detectorが特定のH/256・H/512ラスタを読めない境界を再現しました。公開 `PURE_BARCODE` hintを使う独立decoderは同じ実ラスタを復号し、最終consumerはdefaultとpureを順に試します。[12サイズ/補正のdecoder境界](evidence/qr-decoder-12-boundary.json)を残し、encoderや画素は変更していません。

PDF配信はsource kit11ファイル、4つのTTF binary/preferred SFD source、元archive29entries・Debian archive18entries、DSCの2つのSHA/容量、exact module worker、4つのWASMを実byte/SHA・HTTPで確認しました。[実配信記録](evidence/pdf-sourcekit-independent.json)のexitは0です。FontForge再buildとPGP署名確認、法的評価は実施していません。

初回localeの9項目×4条件の失敗、初回formal17/18のcrop破棄境界、Gallery generic divのincomplete、RTL Compareの実不一致、Code128狭幅復号失敗、補助probeの描画時点/API呼出エラーを保存しています。crop破棄はクリック直後のconnected DOMと、実detach後のcallbackを分けて観測し、後者は出力0でした。正式試験はactual detachをawaitする修正後に18/18へ通過しました。元の失敗を製品成功へ読み替えていません。

残る検証範囲は、MSI/pharmacodeの独立復号（実白黒ラスタと操作は検査済み）、FontForge再build/PGP署名、OS drag、他browser・実upload service・実hardware reader・人のscreen readerです。媒体製品の具体的な未解決findingはありません。全raw evidence、旧失敗、AX、PNG、logs、exitsとsourceの採取manifestを親の統合レビューへ引き渡します。
