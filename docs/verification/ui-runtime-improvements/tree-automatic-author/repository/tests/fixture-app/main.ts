import {bootstrapApplication} from '@angular/platform-browser';
import {TreeCatalog} from './tree-catalog';
bootstrapApplication(TreeCatalog).catch((error:unknown)=>{console.error(error);document.body.textContent='検証アプリを開始できませんでした。';});
