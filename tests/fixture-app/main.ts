import { bootstrapApplication } from '@angular/platform-browser';
import {provideUiIcons} from '../../.ui/generated/angular/index';
import {LucideFolder} from '@lucide/angular';
import { FixtureApp } from './app';
import { CatalogFixture } from './catalog';

bootstrapApplication(location.pathname === '/catalog' ? CatalogFixture : FixtureApp, {providers:[provideUiIcons(LucideFolder)]}).catch((error: unknown) => {
  console.error(error);
  document.body.textContent = '検証アプリを開始できませんでした。ブラウザーのコンソールを確認してください。';
});
