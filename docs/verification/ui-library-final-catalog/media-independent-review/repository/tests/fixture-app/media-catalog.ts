const DICTIONARY={
 "容量の上限を超えています。":"File size limit exceeded.",
 "受付形式に合いません。":"File format rejected.",
 "件数の上限を超えています。":"File count limit exceeded.",
 "カルーセル":"carousel",
 "スライド":"slide",
 "Application retryable failure":"Must not translate application error",
 "Original after":"Must not translate application alt",
 "比較境界": "Comparison boundary",
 "比較前の画像を取得できません。": "Before image unavailable.",
 "比較後の画像を取得できません。": "After image unavailable.",
 "比較後の画像を{position}%表示": "After image {position}% shown",
 "比較後の画像を": "After image ",
 "%表示": "% shown",
 "比較後の画像を67%表示": "After image 67% shown",
 "PDFを選択してください。": "Choose a PDF.",
 "PDFを読込み中です。": "Loading PDF.",
 "PDFを読み込みました。": "PDF loaded.",
 "ページを描画中です。": "Rendering page.",
 "ページを表示しました。": "Page displayed.",
 "PDFを読み込めません。表示対象とworker・補助ファイルの配信設定を確認して再試行してください。": "PDF unavailable. Check source, worker and assets; retry.",
 "PDFのダウンロードを開始しました。": "PDF download started.",
 "PDFを再取得": "Retry PDF",
 "ページ番号を1から": "Specify page from 1 to ",
 "の範囲で指定してください。": " in the supported range.",
 "次のページ": "Next page",
 "前のページ": "Previous page",
 "ページ": "Page",
 "拡大率": "Zoom",
 "画像を選択してください。": "Choose an image.",
 "画像を読込み中です。": "Loading image.",
 "切抜き範囲を変更できます。": "Crop range ready.",
 "画像を読み込めません。形式とデータを確認して選び直してください。": "Image unavailable. Check format and reselect.",
 "比率を変更しました。": "Ratio changed.",
 "画像を回転しました。": "Image rotated.",
 "切抜きを作成しています。": "Creating crop.",
 "切抜きを作成しました。": "Crop created.",
 "この内容とサイズではQRコードを作成できません。内容またはサイズを確認してください。": "QR unavailable. Check content and size.",
 "この形式・内容・サイズではバーコードを作成できません。形式の桁数とサイズを確認してください。": "Barcode unavailable. Check format, digits and size.",
 "停止しました。": "Stopped.",
 "再生中": "Playing.",
 "一時停止または停止中": "Paused or stopped.",
 "メディアを取得できません。表示対象と形式を確認して再試行してください。": "Media unavailable. Check source and format; retry.",
 "再生できません。形式・取得状態を確認して再試行してください。": "Cannot play. Check format and download; retry.",
 "メディアを再取得": "Retry media",
 "再生": "Play",
 "一時停止": "Pause",
 "停止": "Stop",
 "音量": "Volume",
 "再生速度": "Playback rate",
 "字幕": "Captions",
 "字幕なし": "No captions"
} as const;
import {Component,DestroyRef,inject,signal,viewChild} from '@angular/core';
import {FormControl,ReactiveFormsModule} from '@angular/forms';
import {ActionControl,FileUpload,Dropzone,UploadList,AttachmentList,Image,ImageViewer,Lightbox,Gallery,Carousel,ImageCompare,ImageCropper,type ImageCropResult,PDFViewer,FilePreview,QRCode,Barcode,MediaPlayer,AudioPlayer,VideoPlayer,type MediaCaption,type UploadEntry,type UploadRequest,type UploadIntent,type MediaImage,UiLocaleScope,type UiLocaleOptions,type PdfSource,type BarcodeFormat} from '../../.ui/generated/angular/index';

@Component({selector:'fixture-app',standalone:true,imports:[ActionControl,FileUpload,UploadList,Image,ImageViewer,Gallery,ImageCompare,ImageCropper,PDFViewer,QRCode,Barcode,MediaPlayer,UiLocaleScope,ReactiveFormsModule],
template:`<main [uiLocale]="localeOptions()" [attr.data-ui-profile]="profile()" [attr.dir]="rtl()?'rtl':'ltr'"><h1>添付・画像・メディアの操作</h1><div class="actions"><button uiAction (click)="profile.set(profile()==='guided'?'dense':'guided')">プロファイル {{profile()}}</button><button uiAction (click)="rtl.set(!rtl())">RTL {{rtl()}}</button><button uiAction (click)="disabled.set(!disabled())">無効 {{disabled()}}</button><button uiAction (click)="hidden.set(!hidden())">媒体を表示・非表示</button><button uiAction (click)="mounted.set(!mounted())">媒体を生成・破棄</button></div>@if(mounted()){<div [hidden]="hidden()"><section data-testid="upload"><h2>ファイル受付</h2><ui-file-upload controlId="upload" label="申請の添付ファイル" accept=".txt,image/png" [maxBytes]="1000" [maxFiles]="3" [items]="uploads()" [disabled]="disabled()" (uploadRequested)="upload($event)" (cancelRequested)="cancel($event)" (removeRequested)="remove($event)" /><div class="actions"><button uiAction (click)="update('progress')">進捗40%</button><button uiAction (click)="update('unknown')">結果不明</button><button uiAction (click)="update('fail')">個別失敗</button><button uiAction (click)="update('success')">アプリで完了</button></div><p data-testid="upload-requests">{{requests()}}</p></section><section data-testid="image"><h2>画像</h2><ui-image [src]="imageSrc()" alt="申請画像" [ratio]="4/3" fit="cover" loading="lazy" /><button uiAction (click)="imageSrc.set(imageSrc()==='/assets/media/broken.png'?'/assets/media/red.svg':'/assets/media/broken.png')">画像取得失敗・復旧</button><button uiAction id="viewer-trigger" (click)="viewerOpen.set(true)">画像ビューアーを開く</button><ui-image-viewer [images]="images" [open]="viewerOpen()" (openChange)="viewerOpen.set($event)" /></section><section data-testid="gallery"><h2>ギャラリー</h2><ui-gallery label="添付写真" [images]="images" [intervalMs]="350" [autoplay]="autoplay()" [disabled]="disabled()" /><button uiAction (click)="autoplay.set(!autoplay())">外部自動送り切替</button></section><section data-testid="compare"><h2>画像比較</h2><ui-image-compare [before]="compareBefore()" [after]="compareAfter()" [direction]="direction()" [disabled]="disabled()" /><button uiAction (click)="direction.set(direction()==='horizontal'?'vertical':'horizontal')">比較方向を変更</button></section><section data-testid="crop"><h2>画像切抜き</h2><label>切抜くファイル<input type="file" accept="image/*" (change)="cropFile.set($any($event.target).files[0]??null)"></label><ui-image-cropper label="提出写真" alt="切抜き元の写真" [file]="cropFile()" [disabled]="disabled()" (confirmed)="cropped($event)" />@if(cropOutput()){<p data-testid="crop-size">{{cropOutput()!.width}}×{{cropOutput()!.height}} · 回転{{cropOutput()!.rotation}}</p><img [src]="cropUrl()" alt="確定した切抜き結果">}</section><section data-testid="pdf"><h2>PDF</h2><ui-pdf-viewer label="申請資料" [source]="pdfSrc()" workerUrl="/assets/pdf/pdf.worker.mjs" assetsBaseUrl="/assets/pdf/" [disabled]="disabled()" /><button uiAction (click)="pdfSrc.set(pdfSrc()==='/assets/media/invalid.pdf'?'/assets/media/sample.pdf':'/assets/media/invalid.pdf')">PDF表示対象を変更</button></section><section data-testid="audio"><h2>音声</h2><ui-audio-player #audioPlayer label="音声添付" kind="audio" [src]="audioSrc()" [captions]="captions()" transcript="確認用の一定音です。" [disabled]="disabled()" /></section><section data-testid="video"><h2>動画</h2><label>動画ファイル<input type="file" accept="video/*" (change)="videoFile($event)"></label><ui-video-player label="動画添付" [src]="videoSrc()" [captions]="captions()" [disabled]="disabled()" /></section><section data-testid="codes"><h2>機械可読コード</h2><label>コード内容<input [value]="code()" (input)="code.set($any($event.target).value)"></label><ui-qr-code [value]="code()" description="申請参照用QRコード" [size]="qrSize()" [errorCorrection]="qrCorrection()" /><ui-barcode [value]="barcodeCode()" [format]="barcodeFormat()" description="申請番号のバーコード" [size]="barcodeSize()" [height]="barcodeHeight()" [moduleWidth]="barcodeModuleWidth()" /></section><section data-testid="independent"><h2>Independent public consumer</h2><ui-dropzone [formControl]="attachmentDraft" controlId="independent-picker" label="Independent accepted draft" accept=".txt" [maxBytes]="16" [maxFiles]="2" [items]="independentUploads()" (uploadRequested)="independentUpload($event)" (selection)="independentSelection.set($event)" /><ui-attachment-list label="Independent attachment list" [items]="independentUploads()" (cancelRequested)="independentCancel($event)" (removeRequested)="independentRemove($event)" (retryRequested)="independentRetry($event)" /><button uiAction (click)="switchDictionary(true)">Dictionary EN</button><button uiAction (click)="switchDictionary(false)">Dictionary JA</button><p data-testid="draft-names">{{draftNames()}}</p></section></div>}</main>`,styles:`main{max-inline-size:var(--ui-size-content);margin:auto;padding:var(--ui-space-page);font:var(--ui-text-body)/var(--ui-leading-body) var(--ui-font-body);color:var(--ui-color-text);background:var(--ui-color-surface);overflow-wrap:anywhere;}section{margin-block:var(--ui-space-section);padding-block:var(--ui-space-section);border-block-end:var(--ui-border-control) solid var(--ui-color-border);min-inline-size:0;}.actions{display:flex;flex-wrap:wrap;gap:var(--ui-space-control-gap);}label{display:block;}input{max-inline-size:100%;}img{max-inline-size:100%;}[hidden]{display:none!important;}`})
export class MediaCatalog {

 readonly publicAliases={Dropzone,AttachmentList,Lightbox,Carousel,FilePreview,AudioPlayer,VideoPlayer};
 readonly localeOptions=signal<UiLocaleOptions>({locale:'ja-JP'});
 readonly compareBefore=signal<MediaImage>({id:'before',src:'/assets/media/red.svg',alt:'Original before'});
 readonly compareAfter=signal<MediaImage>({id:'after',src:'/assets/media/blue.svg',alt:'Original after'});
 readonly barcodeCode=signal('UI123456');readonly barcodeFormat=signal<BarcodeFormat>('CODE128');readonly barcodeSize=signal(400);readonly barcodeHeight=signal(80);readonly barcodeModuleWidth=signal(2);readonly qrSize=signal(256);readonly qrCorrection=signal<'L'|'M'|'Q'|'H'>('M');
 readonly attachmentDraft=new FormControl<readonly File[]|null>(null);
 readonly independentUploads=signal<readonly UploadEntry[]>([]);
 readonly independentSelection=signal<unknown>(null);
 readonly independentAttempts:UploadRequest[]=[];
 readonly independentResponses:Array<{id:string;requestId:number;accepted:boolean}>=[];
 readonly dictionary:Readonly<Record<string,string>>=DICTIONARY;
 switchDictionary(english:boolean):void{this.localeOptions.set({locale:english?'en-US':'ja-JP',messages:english?this.dictionary:{}});}
 draftNames():string{return this.attachmentDraft.value?.map(file=>file.name).join(',')??'';}
 independentUpload(request:UploadRequest):void{this.independentAttempts.push(request);const entry:UploadEntry={...request,name:request.file.name,size:request.file.size,type:request.file.type,status:'uploading',progress:null};this.independentUploads.update(items=>items.some(item=>item.id===request.id)?items.map(item=>item.id===request.id?entry:item):[...items,entry]);}
 independentCancel(intent:UploadIntent):void{this.independentUploads.update(items=>items.map(item=>item.id===intent.id&&item.requestId===intent.requestId?{...item,status:'cancelled'}:item));}
 independentRemove(intent:UploadIntent):void{this.independentUploads.update(items=>items.filter(item=>item.id!==intent.id||item.requestId!==intent.requestId));}
 independentRetry(intent:UploadIntent):void{const previous=this.independentUploads().find(item=>item.id===intent.id&&item.requestId===intent.requestId);if(previous?.file)this.independentUpload({id:previous.id,requestId:Math.max(0,...this.independentAttempts.map(item=>item.requestId))+1,file:previous.file});}
 independentResponse(intent:UploadIntent,status:'success'|'failed'):void{const accepted=this.independentUploads().some(item=>item.id===intent.id&&item.requestId===intent.requestId);this.independentResponses.push({...intent,accepted});this.independentUploads.update(items=>items.map(item=>item.id===intent.id&&item.requestId===intent.requestId?{...item,status,progress:status==='success'?100:null,error:status==='failed'?'Application retryable failure':undefined}:item));}

 readonly audioPlayer=viewChild<MediaPlayer>('audioPlayer');readonly profile=signal<'guided'|'dense'>('guided');readonly rtl=signal(false);readonly disabled=signal(false);readonly hidden=signal(false);readonly mounted=signal(true);readonly viewerOpen=signal(false);readonly autoplay=signal(false);readonly direction=signal<'horizontal'|'vertical'>('horizontal');readonly imageSrc=signal('/assets/media/red.svg');readonly pdfSrc=signal<PdfSource|null>('/assets/media/sample.pdf');readonly code=signal('UI123456');readonly audioSrc=signal('/assets/media/tone.wav');readonly videoSrc=signal('');readonly uploads=signal<readonly UploadEntry[]>([]);readonly requests=signal(0);readonly cropFile=signal<File|null>(null);readonly cropOutput=signal<ImageCropResult|null>(null);readonly cropUrl=signal('');private videoUrl='';
 readonly images:readonly MediaImage[]=[{id:'red',src:'/assets/media/red.svg',alt:'赤い写真',caption:'申請1の添付'},{id:'blue',src:'/assets/media/blue.svg',alt:'青い写真',caption:'申請2の添付'},{id:'green',src:'/assets/media/green.svg',alt:'緑の写真',caption:'申請3の添付'}];readonly captions=signal<readonly MediaCaption[]>([{id:'ja',src:'/assets/media/sample.vtt',language:'ja',label:'日本語字幕'}]);
 constructor(){inject(DestroyRef).onDestroy(()=>{if(this.cropUrl())URL.revokeObjectURL(this.cropUrl());if(this.videoUrl)URL.revokeObjectURL(this.videoUrl);});}
 upload(request:UploadRequest):void{this.requests.update(value=>value+1);const entry:UploadEntry={...request,name:request.file.name,size:request.file.size,type:request.file.type,status:'uploading',progress:null};this.uploads.update(items=>items.some(item=>item.id===request.id)?items.map(item=>item.id===request.id?entry:item):[...items,entry]);}
 cancel(intent:UploadIntent):void{this.uploads.update(items=>items.map(item=>item.id===intent.id&&item.requestId===intent.requestId?{...item,status:'cancelled'}:item));}remove(intent:UploadIntent):void{this.uploads.update(items=>items.filter(item=>item.id!==intent.id||item.requestId!==intent.requestId));}
 update(kind:'progress'|'unknown'|'fail'|'success'):void{this.uploads.update(items=>items.map((item,index)=>kind==='progress'?{...item,progress:40}:kind==='unknown'?{...item,status:'unknown',error:undefined}:kind==='success'?{...item,status:'success',progress:100,error:undefined}:index===0?{...item,status:'failed',error:'送信先を確認して再試行してください。'}:item));}
 cropped(result:ImageCropResult):void{if(this.cropUrl())URL.revokeObjectURL(this.cropUrl());this.cropOutput.set(result);this.cropUrl.set(URL.createObjectURL(result.blob));}
 videoFile(event:Event):void{const file=(event.target as HTMLInputElement).files?.[0];if(this.videoUrl)URL.revokeObjectURL(this.videoUrl);this.videoUrl=file?URL.createObjectURL(file):'';this.videoSrc.set(this.videoUrl);}
}
