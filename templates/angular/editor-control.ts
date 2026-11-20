import {computed as uiLocaleComputed} from '@angular/core';
import {injectUiMessageText} from './locale';
import {Directive,effect,input,output,signal,ChangeDetectorRef,inject} from '@angular/core';
import type {ControlValueAccessor} from '@angular/forms';
/** UI draft is owned here; application state and saved state remain controlled inputs/CVA writes. */
@Directive({standalone:true})
export abstract class SpecialistEditorControl implements ControlValueAccessor {
 protected readonly uiText_SpecialistEditorControl=injectUiMessageText();
 readonly label=input<string>();
 protected readonly uiEffective_label=uiLocaleComputed(()=>this.label()??this.uiText_SpecialistEditorControl("uiFoundation.specialistEditorControl.edit"));readonly value=input<string|undefined>();readonly valueChange=output<string>();readonly readonly=input(false);readonly disabled=input(false);readonly busy=input(false);protected readonly draft=signal('');protected readonly formDisabled=signal(false);protected readonly blocked=()=>this.disabled()||this.formDisabled()||this.busy();private readonly changeDetector=inject(ChangeDetectorRef);private onChange:(value:string)=>void=()=>{};private onTouched:()=>void=()=>{};
 constructor(){effect(()=>{const value=this.value();if(value!==undefined)this.draft.set(value);});}
 writeValue(value:unknown):void{this.draft.set(typeof value==='string'?value:'');this.changeDetector.markForCheck();}
 registerOnChange(callback:(value:string)=>void):void{this.onChange=callback;}
 registerOnTouched(callback:()=>void):void{this.onTouched=callback;}
 setDisabledState(disabled:boolean):void{this.formDisabled.set(disabled);}
 protected edited(value:string):void{if(this.blocked()||this.readonly())return;this.draft.set(value);this.onChange(value);this.valueChange.emit(value);this.changeDetector.markForCheck();}
 protected touched():void{this.onTouched();}
}
