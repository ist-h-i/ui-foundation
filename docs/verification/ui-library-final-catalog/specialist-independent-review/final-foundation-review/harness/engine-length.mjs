/** Public ECharts center/radius values: numeric means pixels, % string is proportional. */
export function engineLength(value,base){
 if(typeof value==='number'){if(!Number.isFinite(value))throw new TypeError('Non-finite engine length');return value;}
 if(typeof value!=='string')throw new TypeError('Unsupported engine length');
 const string=value.trim(),number=Number(string.endsWith('%')?string.slice(0,-1):string);
 if(!string||!Number.isFinite(number))throw new TypeError('Invalid engine length');
 return string.endsWith('%')?number*base/100:number;
}
