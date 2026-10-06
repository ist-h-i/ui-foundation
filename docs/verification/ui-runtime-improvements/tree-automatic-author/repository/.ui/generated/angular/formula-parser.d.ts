declare module 'fast-formula-parser' {
  interface CellReference {row:number;col:number;sheet?:string;}
  interface RangeReference {sheet?:string;from:{row:number;col:number};to:{row:number;col:number};}
  export default class FormulaParser {
    constructor(options:{onCell:(reference:CellReference)=>unknown;onRange:(reference:RangeReference)=>unknown[][];});
    parse(formula:string,position:CellReference):unknown;
  }
}
