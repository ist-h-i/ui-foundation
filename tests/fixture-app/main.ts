import { bootstrapApplication } from '@angular/platform-browser';
import { FixtureApp } from './app';
import { CatalogFixture } from './catalog';

bootstrapApplication(location.pathname === '/catalog' ? CatalogFixture : FixtureApp).catch((error: unknown) => {
  console.error(error);
  document.body.textContent = '検証アプリを開始できませんでした。ブラウザーのコンソールを確認してください。';
});
