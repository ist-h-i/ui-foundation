# File, image, audio and video public contracts

[Japanese](ui-library-media-expansion-spec.ja.md)

Public APIs for files, images, audio, video, PDF and code rendering. Export aliases also include `Dropzone/AttachmentList/FilePreview/Lightbox/Carousel/AudioPlayer/VideoPlayer`. Read the [types/methods](ui-library-api.json) and [delivery guide](ui-library-consumer-guide.en.md#css-and-distribution-assets).

## Inputs and events

| Public component | Inputs | Outputs |
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

media-01/02 validate actual File type/size/count through the same native-picker/drop path; CVA is the completely accepted batch. media-03 provides file information and individual progress/failure/cancel/remove/retry. media-04 uses an actual PDF worker/canvas with pages/zoom/original-PDF download. media-05 covers alt/ratio/fit/load failure/retry/native lazy loading. media-06 supplies previous/next/zoom/rotation/close inside Dialog. media-07 covers paging/autoplay/interval/stop. media-08 uses actual clipping and native-range direction/boundaries. media-09 produces actual PNG crops with ratio/90-degree rotation/confirmation. media-10 operates the same HTMLMediaElement for play/stop/volume/speed/captions/fullscreen. media-11 performs actual QR/barcode encoding with complete textual descriptions.

## Ownership and recovery

UploadEntry contains id/name/size/type/file?/requestId/status/progress/error; status is queued/uploading/success/failed/cancelled/unknown. Null progress remains unknown, not zero. Retry retains the File; the app accepts only current id/requestId responses. Actual transport, cancellation completion, removal, authorization and undo are app-owned.

PdfSource is URL/Blob/Uint8Array. Module-worker startup is separate from document decode/render; source/page/zoom changes and destruction invalidate old results. Deliver matching exact-version worker/cmaps/fonts/wasm/iccs and original font licenses/source kit. An HTML embed alone is not completion; do not create unconditionally trusted resources. Worker/invalid-PDF failures return to retry; unload ends the session. Native details retain page text.

ImageCropResult contains blob/width/height/sourceBounds/displayBounds/rotation/requestId. Coordinates refer to rotated source pixels, not CSS-scaled coordinates. Source/range/ratio/rotation changes, hidden/disabled/destruction invalidate pending crops and close old Bitmaps. The component creates no object URL; the app creating a result URL revokes it. Native X/Y/width/height inputs provide alternatives to pointer interaction.

Lightbox offers25–400% zoom and90-degree rotation. A named region uses actual rotated-image bounds so scrolling reaches all content. Gallery pauses on focus without automatic resume; focus events do not reverse explicit pointer-stop intent. Hover/hidden/inert/document invisibility/destruction manage timers while respecting reduced motion and manual Stop.

Media Stop means pause plus time0. Source changes/hidden/disabled/destruction stop the current owner's playback. Old play Promises cannot change new playback. Caption removal, same-ID source replacement and reordering synchronize modes/cues. Fullscreen targets the player region. Before a play/retry button is disabled/removed, retain owned focus in the status description. On completion, return to an available play/retry action only if focus is still owned; do not take focus or viewport position from another user-selected action. After rendering, retained-focus status and completion actions reveal readable text/focus outlines within the viewport.

Image/QR encoding pixels are data. Surrounding text/surface/focus/dimensions follow semantic tokens/profiles, but themes do not alter encoding quiet zones or black/white pixels. Barcode formats are CODE128/CODE39/EAN13/EAN8/UPC/ITF/ITF14/MSI/pharmacode/codabar. Invalid content/insufficient required width produce diagnostics.

## Dependencies and limits

Uses public JS APIs from PDF.js6.4.299, qrcode1.5.4 and JsBarcode3.12.3 plus native File/Bitmap/Canvas/media. No additional storage/media service or account is assumed. Primary references: [PDF.js](https://mozilla.github.io/pdf.js/getting_started/), [qrcode](https://github.com/soldair/node-qrcode), [JsBarcode](https://github.com/lindell/JsBarcode), [WHATWG media](https://html.spec.whatwg.org/multipage/media.html), [APG Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).

Verify real upload services, browser differences and assistive technology in the consuming app.

ImageCompare coordinates are physical image coordinates: left/top0, right/bottom100. Surrounding RTL/language changes do not change them; native range stays LTR so divider and thumb agree. Labels/descriptions follow surrounding language/direction.

Barcode `size` and `moduleWidth` specify actual encoding dimensions; CSS does not shrink bars. Codes wider than the region remain fully reachable through a described component-local scroll region using keyboard/pointer/touch. Image coordinates remain LTR in surrounding RTL. The app selects size for required module width/destination. The contract does not promise the full code fits one clipped viewport or scans on every reader.
