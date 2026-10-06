import {BinaryBitmap,BarcodeFormat,DecodeHintType,MultiFormatReader,Code128Reader,HybridBinarizer,QRCodeReader,RGBLuminanceSource} from '@zxing/library';

/** Independently decode the actual encoder raster without changing its drawing context. */
export function decodeCanvas(canvas:HTMLCanvasElement,format:'qr'|'code128'|'CODE39'|'EAN13'|'EAN8'|'UPC'|'ITF'|'ITF14'|'codabar'='qr'):string {
 const readback=canvas.ownerDocument.createElement('canvas');readback.width=canvas.width;readback.height=canvas.height;
 const context=readback.getContext('2d',{willReadFrequently:true})!;context.drawImage(canvas,0,0);
 const rgba=context.getImageData(0,0,canvas.width,canvas.height).data,argb=new Int32Array(canvas.width*canvas.height);
 for(let i=0;i<argb.length;i++)argb[i]=(rgba[i*4]!<<16)|(rgba[i*4+1]!<<8)|rgba[i*4+2]!;
 const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(argb,canvas.width,canvas.height)));
 if(format==='qr'){try{return new QRCodeReader().decode(bitmap).getText();}catch{return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(argb,canvas.width,canvas.height))),new Map([[DecodeHintType.PURE_BARCODE,true]])).getText();}}if(format==='code128')return new Code128Reader().decode(bitmap).getText();const formats={CODE39:BarcodeFormat.CODE_39,EAN13:BarcodeFormat.EAN_13,EAN8:BarcodeFormat.EAN_8,UPC:BarcodeFormat.UPC_A,ITF:BarcodeFormat.ITF,ITF14:BarcodeFormat.ITF,codabar:BarcodeFormat.CODABAR};return new MultiFormatReader().decode(bitmap,new Map([[DecodeHintType.POSSIBLE_FORMATS,[formats[format]]]])).getText();
}
