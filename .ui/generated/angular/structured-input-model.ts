export type MaskPart = {kind:'literal';value:string} | {kind:'digit'|'letter'|'alphanumeric'};
export const graphemes=(value:string):string[]=>Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value),part=>part.segment);
export function parseMask(mask:string):readonly MaskPart[] {
 const characters=graphemes(mask),parts:MaskPart[]=[];let escaped=false;
 for(const character of characters){if(escaped){parts.push({kind:'literal',value:character});escaped=false;}else if(character==='\\')escaped=true;else if(character==='9')parts.push({kind:'digit'});else if(character==='A')parts.push({kind:'letter'});else if(character==='*')parts.push({kind:'alphanumeric'});else parts.push({kind:'literal',value:character});}
 const slots=parts.filter(part=>part.kind!=='literal').length;
 if(escaped||!slots||slots>128||parts.length>256)throw new Error('Mask requires 1–128 value slots, at most 256 parts, and a complete escape.');return parts;
}
// A grapheme may contain several Unicode letters (Hangul Jamo or Indic conjuncts).
// readMasked segments first; these tests never accept multiple adjacent graphemes.
const letterGrapheme=/^\p{L}[\p{L}\p{M}\u200c\u200d]*$/u;
const matches=(part:MaskPart,character:string):boolean=>part.kind==='literal'?part.value===character:part.kind==='digit'?/^[0-9]$/.test(character):part.kind==='letter'?letterGrapheme.test(character):letterGrapheme.test(character)||/^[0-9]$/.test(character);
/** Accept a raw prefix or its formatted representation. Never discard an invalid character. */
export function readMasked(value:string,parts:readonly MaskPart[]):string|null {
 const characters=graphemes(value),slots=parts.filter(part=>part.kind!=='literal');
 if(characters.length<=slots.length&&characters.every((character,index)=>matches(slots[index]!,character)))return value;
 let index=0,raw='';for(const part of parts){if(index===characters.length)break;if(part.kind==='literal'){if(characters[index]===part.value)index++;}else{const character=characters[index]!;if(!matches(part,character))return shiftedPunctuation(characters,parts);raw+=character;index++;}}
 return index===characters.length?raw:shiftedPunctuation(characters,parts);
}
/** A native insertion may shift an existing separator. Only configured punctuation may move; letters/digits and duplicate punctuation remain invalid. */
function shiftedPunctuation(characters:readonly string[],parts:readonly MaskPart[]):string|null {
 const punctuation=parts.filter((part):part is {kind:'literal';value:string}=>part.kind==='literal'&&!/[\p{L}\p{N}]/u.test(part.value)).map(part=>part.value);
 const counts=new Map<string,number>();for(const character of punctuation)counts.set(character,(counts.get(character)??0)+1);
 const slots=parts.filter(part=>part.kind!=='literal'),raw:string[]=[];let last=-1;
 for(const character of characters){if(counts.has(character)){const remaining=counts.get(character)!;const position=punctuation.indexOf(character,last+1);if(!remaining||position<0)return null;counts.set(character,remaining-1);last=position;}else raw.push(character);}
 return raw.length<=slots.length&&raw.every((character,index)=>matches(slots[index]!,character))?raw.join(''):null;
}
export function formatMasked(raw:string,parts:readonly MaskPart[],placeholder:string|null=null):string {
 const characters=graphemes(raw);if(!characters.length&&placeholder===null)return '';let index=0,result='';
 for(const part of parts){if(part.kind==='literal'){result+=part.value;}else if(index<characters.length){result+=characters[index++];}else if(placeholder!==null){result+=placeholder;}else break;}return result;
}
export function maskCaret(raw:string,parts:readonly MaskPart[],count:number):number {
 const characters=graphemes(raw);let filled=0,offset=0;for(const part of parts){if(part.kind==='literal')offset+=part.value.length;else{if(filled===count||filled===characters.length)break;offset+=characters[filled++]!.length;}}return offset;
}
export function validateOTP(value:string,digits:number,kind:'numeric'|'alphanumeric'):boolean {
 return Number.isSafeInteger(digits)&&digits>0&&digits<=64&&value.length===digits&&(kind==='numeric'?/^[0-9]+$/:/^[A-Za-z0-9]+$/).test(value);
}
