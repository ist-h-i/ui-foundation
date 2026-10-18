import {test} from './css-override-test';
import {verifyCodeEditorNativeInput} from './code-editor-native';
for(const profile of ['guided','dense'] as const){
 test(`CodeEditor ${profile}: native input retains text and doc-only configuration`,async({page},info)=>{await verifyCodeEditorNativeInput(page,profile,info);});
 test(`CodeEditor ${profile}: native input survives scroll before mutation delivery`,async({page},info)=>{await verifyCodeEditorNativeInput(page,profile,info,true);});
}
