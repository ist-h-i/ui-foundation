# ファイル・画像・音声・動画の公開契約

ファイル・画像・音声・動画・PDF・コード描画の公開APIです。export aliasは`Dropzone/AttachmentList/FilePreview/Lightbox/Carousel/AudioPlayer/VideoPlayer`も公開します。[型とmethods](ui-library-api.json)、[利用ガイドの配布資産](ui-library-consumer-guide.ja.md#css-と配布資産)を参照してください。

## 入力とイベント

| 公開部品 | 入力 | 出力 |
| --- | --- | --- |
| FileUpload | `locale` / `controlId` / `label` / `accept` / `maxBytes` / `maxFiles` / `multiple` / `disabled` / `busy` / `items` / `dropEnabled` / `dropLabel` / `existingCount` / `value` / `readonly` / `required` | `valueChange` / `selection` / `uploadRequested` / `cancelRequested` / `removeRequested` |
| UploadList | `locale` / `label` / `items` / `disabled` / `cancelable` / `retryable` / `removable` | `cancelRequested` / `retryRequested` / `removeRequested` |
| Image | `src` / `alt` / `ratio` / `fit` / `loading` / `caption` | `loaded` / `loadFailed` |
| ImageViewer | `label` / `images` / `open` / `index` / `zoom` / `rotation` | `openChange` / `indexChange` / `zoomChange` / `rotationChange` |
| Gallery | `label` / `images` / `index` / `autoplay` / `intervalMs` / `loop` / `disabled` / `ratio` | `indexChange` |
| ImageCompare | `label` / `before` / `after` / `direction` / `position` / `ratio` / `disabled` | `positionChange` |
| ImageCropper | `label` / `alt` / `file` / `range` / `ratio` / `rotation` / `disabled` | `rangeChange` / `ratioChange` / `rotationChange` / `confirmed` / `loadFailed` |
| PDFViewer | `label` / `source` / `workerUrl` / `assetsBaseUrl` / `page` / `zoom` / `downloadable` / `filename` / `disabled` | `pageChange` / `zoomChange` / `loaded` / `loadFailed` |
| MediaPlayer | `label` / `kind` / `src` / `poster` / `preload` / `captions` / `transcript` / `disabled` | `stateChange` / `playbackFailed` |
| QRCode | `value` / `description` / `size` / `format` / `errorCorrection` | — |
| Barcode | `value` / `description` / `format` / `size` / `height` / `moduleWidth` | — |

media-01/02は実Fileの形式/容量/件数を検証し、native picker/dropが同じ経路を通る。CVAは完全受理batch。media-03はファイル情報・個別進捗/失敗/取消/削除/retry。media-04は実PDF worker/canvas/ページ/zoom/元PDF download。media-05はalt/ratio/fit/取得失敗・再取得/native lazy。media-06はDialog内の前後/zoom/回転/終了。media-07はページ/自動送り/間隔/停止。media-08は実clip/native range方向・境界操作。media-09は実PNG crop/比率/90度回転/確定。media-10は同じHTMLMediaElementの再生/停止/音量/速度/字幕/全画面。media-11は実QR/Barcode符号化と全文説明。

## 所有と復旧

UploadEntryはid/name/size/type/file?/requestId/status/progress/error。statusはqueued/uploading/success/failed/cancelled/unknown。null進捗を0へ変えない。retryでFileを保ち、アプリは現在id/requestIdの応答だけを採用する。実通信・取消完了・削除・認可・Undoはアプリが所有する。

PdfSourceはURL/Blob/Uint8Array。module worker開始と文書decode/renderを分け、source/page/zoom替えやdestroyで旧結果を失効する。worker/cmaps/fonts/wasm/iccsをexact版で配信し、font原license/source kitを含める。HTML embedだけで完成と数えず、無条件trusted resourceを作らない。worker/不正PDFの失敗は再試行へ戻しunloadでsession終了。ページ本文をnative detailsに残す。

ImageCropResultはblob/width/height/sourceBounds/displayBounds/rotation/requestId。座標は回転後source pixelでCSS縮小座標ではない。source/range/ratio/rotation替え、hidden/disabled/destroyで保留cropを失効し、旧Bitmapをclose。部品はobjectURLを作らず、結果URLを作るアプリがrevokeする。native X/Y/幅/高さがpointerの操作代替。

Lightboxは25〜400%zoom・90度回転。回転画像の実boundsを持つnamed regionから全内容へscrollで到達できる。Galleryはfocusで停止し自動再開せず、pointer停止の意図をfocusイベントで反転しない。hover/hidden/inert/文書非表示/destroyでtimerを扱い、reduced motionとmanual Stopを尊重する。

Media停止はpause+time0。source替え/hidden/disabled/destroyは現owner再生を止め、旧play Promiseは新再生を変更しない。字幕削除・同ID src替え・順替えでmode/cueを整合する。Fullscreenはプレイヤー領域を対象にする。再生開始・再取得で自前buttonが無効化・除去される前に状態説明へfocusを保持する。完了時はまだ自前focusを持つ場合だけ利用可能な再生・再試行操作へ戻し、利用者が別の操作へ移したfocusと画面位置を奪わない。自前focusを保持する状態説明と完了後の操作は、描画後に文字とfocus枠が画面内で読めるように表示する。

画像/QRの符号化画素はデータ。外側の文言/surface/focus/寸法をsemantic/profileに接続し、quiet zoneや白黒をテーマで変更しない。Barcode型はCODE128/CODE39/EAN13/EAN8/UPC/ITF/ITF14/MSI/pharmacode/codabar。内容/必要幅不足は診断する。

## 依存と利用上の制約

PDF.js6.4.299、qrcode1.5.4、JsBarcode3.12.3の公開JS APIとnative File/Bitmap/Canvas/mediaを利用する。追加storage/mediaサービスやaccountは前提にしない。一次資料: [PDF.js](https://mozilla.github.io/pdf.js/getting_started/)、[qrcode](https://github.com/soldair/node-qrcode)、[JsBarcode](https://github.com/lindell/JsBarcode)、[WHATWG media](https://html.spec.whatwg.org/multipage/media.html)、[APG Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)。

実uploadサービス、ブラウザー差、支援技術は利用アプリで確認してください。

ImageCompare の比較座標は画像の物理的な左端／上端を0、右端／下端を100とします。周囲のRTLや言語変更でもこの座標は変えず、native rangeはLTR方向で境界線とつまみを一致させます。ラベルと説明文は周囲の言語・方向へ追随します。

Barcode の `size` と `moduleWidth` は符号化した実寸を指定し、CSSでバーを縮小しません。領域より広いコードは、説明付きの部品内スクロール領域でキーボード・ポインター・タッチ操作により端まで確認できます。周囲RTLでも画像座標はLTRです。アプリは必要なmodule幅と表示先に応じて `size` を選びます。切り取られた単一viewportにコード全体が収まる・全読み取り機で読み取れることは保証しません。
