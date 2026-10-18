import {Component,ChangeDetectionStrategy,DestroyRef,ElementRef,input,output,inject,viewChild} from '@angular/core';
import {Chart} from '../../.ui/generated/angular/chart';
import type {ChartKind,ChartSeries,ChartSelection} from '../../.ui/generated/angular/specialist-model';
import type {EChartsType} from 'echarts/core';

/** Test-only renderer comparison. Product Chart has no canvas renderer input. */
@Component({selector:'runtime-residual-canvas',standalone:true,imports:[Chart],changeDetection:ChangeDetectionStrategy.OnPush,
 template:`<ui-chart #product [kind]="kind()" [series]="series()" [legend]="false" (selectionChange)="selectionChange.emit($event)"/><div class="ui-specialist-plot-scroll" role="region" aria-label="CanvasRenderer比較" dir="ltr"><div #canvasSurface class="comparison-canvas" aria-hidden="true"></div></div>`,
 styles:`:host{display:block;min-inline-size:0}.ui-specialist-plot-scroll{overflow:auto;max-inline-size:100%}.comparison-canvas{position:relative;block-size:var(--ui-size-visualization-viewport);inline-size:100%}`})
export class RuntimeResidualCanvas {
 readonly selectionChange=output<ChartSelection>();
 readonly kind=input<ChartKind>('bar');readonly series=input<readonly ChartSeries[]>([]);
 readonly product=viewChild.required<Chart>('product');
 private readonly surface=viewChild.required<ElementRef<HTMLElement>>('canvasSurface');
 private readonly destroyRef=inject(DestroyRef);
 private canvasEngine:EChartsType|null=null;
 constructor(){this.destroyRef.onDestroy(()=>{this.canvasEngine?.dispose();this.canvasEngine=null;});}
 /** Copies the actual product engine's shared chartOptions result, without replacing product rendering. */
 async refreshCanvas():Promise<void>{
  const [engine,renderers]=await Promise.all([import('echarts/core'),import('echarts/renderers')]);
  if(this.destroyRef.destroyed)return;
  const product=this.product() as unknown as {chart:EChartsType|null};
  if(!product.chart)throw new Error('Product Chart must finish mounting before renderer comparison');
  const svgSurface=product.chart.getDom(),width=svgSurface.clientWidth,height=svgSurface.clientHeight;
  this.surface().nativeElement.style.inlineSize=width+'px';
  this.surface().nativeElement.style.blockSize=height+'px';
  engine.use([renderers.CanvasRenderer]);
  this.canvasEngine??=engine.init(this.surface().nativeElement,undefined,{renderer:'canvas',width,height});
  this.canvasEngine.resize({width,height});
  this.canvasEngine.setOption(product.chart.getOption(),{notMerge:true});
 }
}
