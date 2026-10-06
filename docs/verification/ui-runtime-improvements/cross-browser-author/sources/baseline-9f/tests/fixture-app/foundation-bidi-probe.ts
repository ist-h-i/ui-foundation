import {Directive,ElementRef,inject} from '@angular/core';
import {Directionality} from '@angular/cdk/bidi';
@Directive({selector:'[bidiProbe]',standalone:true,host:{'[attr.data-bidi-value]':'direction.value','[attr.data-bidi-signal]':'direction.valueSignal()'}})
export class BidiProbe{readonly direction=inject(Directionality);readonly element=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;}
