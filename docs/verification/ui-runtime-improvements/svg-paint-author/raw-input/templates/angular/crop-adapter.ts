import type {CropBounds} from './media-model';
/** Browser raster decoder/canvas lifetime. It never creates an ObjectURL or starts a timer. */
export class CropSession {
 private closed=false;
 private constructor(private readonly bitmap:ImageBitmap){}
 static async decode(file:File):Promise<CropSession>{return new CropSession(await createImageBitmap(file));}
 dimensions(turns:number):{width:number;height:number}{return turns%2?{width:this.bitmap.height,height:this.bitmap.width}:{width:this.bitmap.width,height:this.bitmap.height};}
 draw(canvas:HTMLCanvasElement,turns:number):void{if(this.closed)throw new Error('Crop image disposed');const size=this.dimensions(turns);canvas.width=size.width;canvas.height=size.height;const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');context.translate(size.width/2,size.height/2);context.rotate(turns*Math.PI/2);context.drawImage(this.bitmap,-this.bitmap.width/2,-this.bitmap.height/2);}
 async crop(owner:Document,bounds:CropBounds,turns:number):Promise<{blob:Blob;width:number;height:number}>{if(this.closed)throw new Error('Crop image disposed');const original=owner.createElement('canvas');this.draw(original,turns);const result=owner.createElement('canvas');result.width=Math.max(1,Math.round(bounds.x2-bounds.x1));result.height=Math.max(1,Math.round(bounds.y2-bounds.y1));const context=result.getContext('2d');if(!context)throw new Error('Canvas unavailable');context.drawImage(original,bounds.x1,bounds.y1,bounds.x2-bounds.x1,bounds.y2-bounds.y1,0,0,result.width,result.height);const blob=await new Promise<Blob|null>(resolve=>result.toBlob(resolve,'image/png'));if(!blob)throw new Error('Canvas output unavailable');return {blob,width:result.width,height:result.height};}
 dispose():void{if(this.closed)return;this.closed=true;this.bitmap.close();}
}
