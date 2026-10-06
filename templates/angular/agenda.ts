import {UiMessagePipe} from './locale';
import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy,Component,signal} from '@angular/core';
import {SchedulerController} from './scheduler-controller';
import type {SchedulerView} from './scheduler-model';
import {schedulerStyles,schedulerTemplate} from './scheduler-view';
/** Native chronological list of a configured civil date range, with the same move contract. */
@Component({selector:'ui-agenda',standalone:true,imports:[NgTemplateOutlet,UiMessagePipe],changeDetection:ChangeDetectionStrategy.OnPush,template:schedulerTemplate,styles:schedulerStyles})
export class Agenda<T=unknown> extends SchedulerController<T>{protected readonly viewSource=signal<SchedulerView>('list');protected readonly allowsViewSwitch=false;}
