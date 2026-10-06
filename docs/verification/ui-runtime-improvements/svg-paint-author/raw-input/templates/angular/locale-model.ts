import type {DateInputFormat} from './date-model';

export type UiDirection='ltr'|'rtl';
/** Keys are library-owned Japanese fallback text, never application data. */
export type UiMessages=Readonly<Record<string,string>>;
export interface UiLocaleOptions{
 locale?:string;
 direction?:UiDirection|null;
 timeZone?:string|null;
 dateInputFormat?:DateInputFormat;
 civilDateOptions?:Intl.DateTimeFormatOptions;
 dateTimeOptions?:Intl.DateTimeFormatOptions;
 numberOptions?:Intl.NumberFormatOptions;
 messages?:UiMessages;
}
export interface UiLocaleResolved{
 readonly locale:string;
 readonly direction:UiDirection|null;
 readonly timeZone:string|null;
 readonly dateInputFormat:DateInputFormat;
 readonly civilDateOptions:Readonly<Intl.DateTimeFormatOptions>;
 readonly dateTimeOptions:Readonly<Intl.DateTimeFormatOptions>;
 readonly numberOptions:Readonly<Intl.NumberFormatOptions>;
 readonly messages:UiMessages;
}
export const defaultUiLocale:UiLocaleResolved=Object.freeze({locale:'ja-JP',direction:null,timeZone:null,dateInputFormat:'native',civilDateOptions:Object.freeze({dateStyle:'full'}),dateTimeOptions:Object.freeze({dateStyle:'medium',timeStyle:'short'}),numberOptions:Object.freeze({}),messages:Object.freeze({})});
const formats:readonly DateInputFormat[]=['native','yyyy-MM-dd','yyyy/MM/dd','dd/MM/yyyy','MM/dd/yyyy'];
/** Validate an explicit runtime choice. No browser language/timezone or YAML inference. */
export function resolveUiLocale(options:UiLocaleOptions,parent:UiLocaleResolved=defaultUiLocale):UiLocaleResolved{
 if(!options||typeof options!=='object'||Array.isArray(options))throw new TypeError('UI locale options must be an object.');
 const locale=options.locale===undefined?parent.locale:options.locale,direction=options.direction===undefined?parent.direction:options.direction,timeZone=options.timeZone===undefined?parent.timeZone:options.timeZone,dateInputFormat=options.dateInputFormat===undefined?parent.dateInputFormat:options.dateInputFormat;
 if(typeof locale!=='string'||!locale.trim())throw new RangeError('UI locale must be a nonempty Intl locale.');
 if(direction!==null&&direction!=='ltr'&&direction!=='rtl')throw new RangeError('UI direction must be ltr, rtl or null (inherit).');
 if(timeZone!==null&&(typeof timeZone!=='string'||!timeZone.trim()))throw new RangeError('UI timezone must be explicit or null (unset).');
 if(!formats.includes(dateInputFormat))throw new RangeError('UI date input format is not supported.');
 const civilDateOptions=options.civilDateOptions===undefined?parent.civilDateOptions:options.civilDateOptions,dateTimeOptions=options.dateTimeOptions===undefined?parent.dateTimeOptions:options.dateTimeOptions,numberOptions=options.numberOptions===undefined?parent.numberOptions:options.numberOptions;
 for(const value of [civilDateOptions,dateTimeOptions,numberOptions])if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('UI Intl format options must be objects.');
 if(civilDateOptions.timeZone!==undefined&&civilDateOptions.timeZone!=='UTC')throw new RangeError('Civil date formatting cannot convert a timezone.');
 if(dateTimeOptions.timeZone!==undefined)throw new RangeError('Set UI timeZone explicitly instead of dateTimeOptions.timeZone.');
 try{new Intl.NumberFormat(locale,numberOptions).format(0);new Intl.Collator(locale);new Intl.DateTimeFormat(locale,{...civilDateOptions,timeZone:'UTC'}).format(0);new Intl.DateTimeFormat(locale,{...dateTimeOptions,timeZone:timeZone??'UTC'}).format(0);}catch{throw new RangeError('UI locale, timezone or Intl format options are invalid.');}
 const supplied=options.messages===undefined?{}:options.messages;if(!supplied||typeof supplied!=='object'||Array.isArray(supplied)||Object.entries(supplied).some(([key,value])=>!key.trim()||typeof value!=='string'||!value.trim()))throw new TypeError('UI messages require nonempty fallback keys and text values.');
 const messages=Object.fromEntries([...Object.entries(parent.messages),...Object.entries(supplied)]);
 return Object.freeze({locale,direction,timeZone,dateInputFormat,civilDateOptions:Object.freeze({...civilDateOptions}),dateTimeOptions:Object.freeze({...dateTimeOptions}),numberOptions:Object.freeze({...numberOptions}),messages:Object.freeze(messages)});
}
/** Angular text interpolation remains responsible for HTML escaping. */
export function uiMessage(source:string,messages:UiMessages,parameters:Readonly<Record<string,string|number>>={}):string{
 const chosen=Object.hasOwn(messages,source)?messages[source]:source;
 return chosen.replace(/\{([\w]+)\}/g,(match,key:string)=>Object.hasOwn(parameters,key)?String(parameters[key]):match);
}
