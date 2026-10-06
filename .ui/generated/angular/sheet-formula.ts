/// <reference path="./formula-parser.d.ts" />
import FormulaParser from 'fast-formula-parser';
import {columnName,sheetProblem,type SheetCell,type SheetModel} from './specialist-model';
export interface SheetResult {value:SheetCell;error:string|null;}
/** Evaluate the original workbook snapshot; re-evaluate after controlled edits. Never eval() or fetch(). */
export function evaluateSheet(sheet:SheetModel):readonly (readonly SheetResult[])[] {
  const problem=sheetProblem(sheet);if(problem)throw new Error(problem);
  const cache=new Map<string,SheetResult>(),visiting=new Set<string>(),width=sheet.rows[0]?.length??0;
  let parser:FormulaParser;
  const cell=(row:number,col:number):SheetResult=>{
    if(row<1||col<1||row>sheet.rows.length||col>width)return {value:null,error:'#REF!'};
    const key=columnName(col-1)+row,cached=cache.get(key);if(cached)return cached;
    if(visiting.has(key))return {value:null,error:'#CYCLE!'};
    const source=sheet.rows[row-1][col-1];let result:SheetResult;
    if(typeof source==='string'&&source.startsWith('=')){
      visiting.add(key);
      try{const value=parser.parse(source.slice(1),{row,col,sheet:'Sheet1'});if(value instanceof Error)throw value;if(!(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)))throw new Error('#VALUE!');result={value,error:null};}
      catch(error){const message=error instanceof Error?[error.name,error.message,String(error)].join(' '):'';const token=['#CYCLE!','#REF!','#DIV/0!','#NAME?','#N/A','#NUM!','#VALUE!'].find(t=>message.includes(t));result={value:null,error:token??'#FORMULA!'};}
      visiting.delete(key);
    }else result={value:typeof source==='string'&&/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(source)&&!/^[-+]?0\d/.test(source)?Number(source):source,error:null};
    cache.set(key,result);return result;
  };
  const reference=(row:number,col:number,sheetName?:string):unknown=>{if(sheetName&&sheetName!=='Sheet1')throw new Error('#REF!');const result=cell(row,col);if(result.error)throw new Error(result.error);return result.value;};
  parser=new FormulaParser({onCell:ref=>reference(ref.row,ref.col,ref.sheet),onRange:ref=>{if(ref.sheet&&ref.sheet!=='Sheet1')throw new Error('#REF!');if(ref.from.row<1||ref.from.col<1||ref.to.row<ref.from.row||ref.to.col<ref.from.col)throw new Error('#REF!');const lastRow=Math.min(ref.to.row,sheet.rows.length),lastCol=Math.min(ref.to.col,width);const values:unknown[][]=[];for(let row=ref.from.row;row<=lastRow;row++){const rowValues:unknown[]=[];for(let col=ref.from.col;col<=lastCol;col++)rowValues.push(reference(row,col));values.push(rowValues);}return values;}});
  return sheet.rows.map((row,r)=>row.map((_,c)=>cell(r+1,c+1)));
}
