import {BinaryBitmap,Code128Reader,HybridBinarizer,QRCodeReader,RGBLuminanceSource} from '@zxing/library';

/** Independently decode the actual encoder raster without changing its drawing context. */
export function decodeCanvas(canvas:HTMLCanvasElement,format:'qr'|'code128'='qr'):string {
 const readback=canvas.ownerDocument.createElement('canvas');readback.width=canvas.width;readback.height=canvas.height;
 const context=readback.getContext('2d',{willReadFrequently:true})!;context.drawImage(canvas,0,0);
 const rgba=context.getImageData(0,0,canvas.width,canvas.height).data,argb=new Int32Array(canvas.width*canvas.height);
 for(let i=0;i<argb.length;i++)argb[i]=(rgba[i*4]!<<16)|(rgba[i*4+1]!<<8)|rgba[i*4+2]!;
 const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(argb,canvas.width,canvas.height)));
 return (format==='qr'?new QRCodeReader():new Code128Reader()).decode(bitmap).getText();
}
