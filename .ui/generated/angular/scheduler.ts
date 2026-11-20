import {UiStableMessagePipe} from './locale';
import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy,Component,input} from '@angular/core';
import {SchedulerController} from './scheduler-controller';
import type {SchedulerView} from './scheduler-model';
import {schedulerStyles,schedulerTemplate} from './scheduler-view';
@Component({selector:'ui-scheduler',standalone:true,imports:[NgTemplateOutlet,UiStableMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,template:schedulerTemplate,styles:schedulerStyles})
export class Scheduler<T=unknown> extends SchedulerController<T>{readonly view=input<SchedulerView>('week');protected readonly viewSource=this.view;protected readonly allowsViewSwitch=true;}
