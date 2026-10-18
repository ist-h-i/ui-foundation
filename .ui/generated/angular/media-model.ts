/** Client-side intake checks only. The application must validate content and policy again. */
export interface UploadConditions { accept: string; maxBytes: number | null; maxFiles: number | null; multiple: boolean; }
export type UploadRejectReason = 'type' | 'size' | 'count';
export interface UploadRejection { file: File; reason: UploadRejectReason; message: string; }
export interface UploadSelection { files: readonly File[]; rejected: readonly UploadRejection[]; }
export type UploadStatus = 'queued' | 'uploading' | 'success' | 'failed' | 'cancelled' | 'unknown';
export interface UploadEntry { id: string; name: string; size: number; type: string; file?: File; requestId: number; status: UploadStatus; progress: number | null; error?: string; }
export interface UploadRequest { id: string; requestId: number; file: File; }
export interface UploadIntent { id: string; requestId: number; }
export function uploadConditions(conditions: UploadConditions): UploadConditions {
 if(conditions.maxBytes!==null&&(!Number.isSafeInteger(conditions.maxBytes)||conditions.maxBytes<0))throw new Error('Upload maxBytes must be a nonnegative integer or null.');
 if(conditions.maxFiles!==null&&(!Number.isSafeInteger(conditions.maxFiles)||conditions.maxFiles<1))throw new Error('Upload maxFiles must be a positive integer or null.');
 if(conditions.accept.split(',').some(part=>part.trim()&&!/^\.[a-z0-9][a-z0-9.+-]*$|^[a-z0-9!#$&^_.+-]+\/(?:[a-z0-9!#$&^_.+-]+|\*)$/i.test(part.trim())))throw new Error('Upload accept must contain extensions or MIME types.');
 return conditions;
}
export function matchesFile(file: Pick<File,'name'|'type'>,accept:string):boolean {
 const choices=accept.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean),type=file.type.toLowerCase(),name=file.name.toLowerCase();
 return choices.length===0||choices.some(choice=>choice.startsWith('.')?name.endsWith(choice):choice.endsWith('/*')?type.startsWith(choice.slice(0,-1)):type===choice);
}
export function selectFiles(files:readonly File[],conditions:UploadConditions,existingCount=0):UploadSelection {
 uploadConditions(conditions);if(!Number.isSafeInteger(existingCount)||existingCount<0)throw new Error('Upload existingCount must be nonnegative.');
 const accepted:File[]=[],rejected:UploadRejection[]=[],limit=conditions.multiple?(conditions.maxFiles??Infinity):Math.min(1,conditions.maxFiles??1);
 for(const file of files){const reason=!matchesFile(file,conditions.accept)?'type':conditions.maxBytes!==null&&file.size>conditions.maxBytes?'size':existingCount+accepted.length>=limit?'count':null;
  if(reason)rejected.push({file,reason,message:reason==='type'?'受付形式に合いません。':reason==='size'?'容量の上限を超えています。':'件数の上限を超えています。'});else accepted.push(file);}
 return {files:accepted,rejected};
}
export function uploadProgress(value:number|null):number|null {if(value===null)return null;if(!Number.isFinite(value)||value<0||value>100)throw new Error('Upload progress must be 0–100 or null.');return value;}
export function uploadStatusLabel(status:UploadStatus):string {return ({queued:'送信待ち',uploading:'送信中',success:'送信済み',failed:'失敗',cancelled:'取消済み',unknown:'結果を確認できません'} as const)[status];}
export function formatFileBytes(bytes:number,locale='ja-JP'):string {if(!Number.isSafeInteger(bytes)||bytes<0)throw new Error('File size must be nonnegative.');return new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(bytes>=1048576?bytes/1048576:bytes>=1024?bytes/1024:bytes)+(bytes>=1048576?' MiB':bytes>=1024?' KiB':' B');}
export interface MediaImage { id:string; src:string; alt:string; caption?:string; }
export interface CropBounds { x1:number;y1:number;x2:number;y2:number; }
export function cropBoundsError(bounds:CropBounds,width:number,height:number,ratio:number|null=null):string|null {
 if(![width,height].every(value=>Number.isFinite(value)&&value>0))return '画像の寸法を確認できません。';
 if(!bounds||typeof bounds!=='object'||![bounds.x1,bounds.y1,bounds.x2,bounds.y2].every(Number.isFinite)||bounds.x1<0||bounds.y1<0||bounds.x2<=bounds.x1||bounds.y2<=bounds.y1||bounds.x2>width||bounds.y2>height)return '切抜き範囲を画像内の正の範囲にしてください。';
 if(ratio!==null&&(!Number.isFinite(ratio)||ratio<=0||Math.abs((bounds.x2-bounds.x1)/(bounds.y2-bounds.y1)-ratio)>0.02))return '切抜き範囲が指定した比率に合いません。';return null;
}
export function positiveMediaNumber(value:number,label:string):number {if(!Number.isFinite(value)||value<=0)throw new Error(label+' must be positive.');return value;}
export function mediaIndex(index:number,count:number):number {if(!Number.isSafeInteger(index))throw new Error('Media index must be an integer.');return count?Math.max(0,Math.min(index,count-1)):0;}
export function comparePosition(value:number):number {if(!Number.isFinite(value)||value<0||value>100)throw new Error('Image comparison position must be 0–100.');return value;}
