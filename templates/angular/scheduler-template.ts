import {Directive,inject,input,TemplateRef} from '@angular/core';
import type {SchedulerEntry,SchedulerEvent} from './scheduler-model';
export interface SchedulerEventContext<T=unknown>{$implicit:SchedulerEvent<T>;event:SchedulerEvent<T>;entry:SchedulerEntry<T>;pending:boolean;}
@Directive({selector:'ng-template[uiSchedulerEvent]',standalone:true})
export class SchedulerEventTemplate<T=unknown>{readonly uiSchedulerEvent=input.required<readonly SchedulerEvent<T>[]>();readonly template=inject<TemplateRef<SchedulerEventContext<T>>>(TemplateRef);static ngTemplateContextGuard<T>(_directive:SchedulerEventTemplate<T>,_context:unknown):_context is SchedulerEventContext<T>{return true;}}
