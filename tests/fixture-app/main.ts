import { bootstrapApplication } from '@angular/platform-browser';
import {provideUiIcons} from '../../.ui/generated/angular/index';
import {LucideFolder} from '@lucide/angular';
import { FixtureApp } from './app';
import { CatalogFixture } from './catalog';
import {FeedbackCatalog} from './feedback-catalog';
import {ActionsCatalog} from './actions-catalog';
import {LayoutCatalog} from './layout-catalog';
import {DisplayCatalog} from './display-catalog';

bootstrapApplication(location.pathname === '/catalog/display' ? DisplayCatalog : location.pathname === '/catalog/feedback' ? FeedbackCatalog : location.pathname === '/catalog/actions' ? ActionsCatalog : location.pathname === '/catalog/layout' ? LayoutCatalog : location.pathname === '/catalog' ? CatalogFixture : FixtureApp, {providers:[provideUiIcons(LucideFolder)]}).catch((error: unknown) => {
  console.error(error);
  document.body.textContent = '検証アプリを開始できませんでした。ブラウザーのコンソールを確認してください。';
});
