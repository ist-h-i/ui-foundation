import {uiMessageText as createUiMessageText, type UiMessageText} from './stable-messages';
const japaneseText = createUiMessageText(() => 'ja-JP');
import {selectFiles,type UploadConditions,type UploadSelection} from './media-model';
export function fileDraftProblem(value:unknown,conditions:UploadConditions, text: UiMessageText = japaneseText):string|null{
 if(value===null||value===undefined)return null;
 if(!Array.isArray(value)||value.some(file=>typeof File==='undefined'||!(file instanceof File)))return text("uiFoundation.fileUpload.useAnArrayOfFileObjectsAsThe");
 return selectFiles(value,conditions,0).rejected[0]?.message??null;
}
/** A rejected intake preserves the previous confirmed form draft atomically. */
export function nextFileDraft(previous:unknown,result:UploadSelection):unknown{
 return result.rejected.length?previous:Object.freeze([...result.files]);
}
