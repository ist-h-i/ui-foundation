import {DiagramValidationCatalog} from './diagram-validation-catalog';
import {SheetLocaleCatalog} from './sheet-locale-catalog';
import {FoundationCatalog} from './foundation-catalog';
import {TableCatalog} from './table-catalog';
import {MediaCatalog} from './media-catalog';
import {decodeCanvas} from './media-decoder';
import { bootstrapApplication } from '@angular/platform-browser';
import {provideUiIcons} from '../../.ui/generated/angular/index';
import {LucideFolder} from '@lucide/angular';
import { FixtureApp } from './app';
import { CatalogFixture } from './catalog';
import {FeedbackCatalog} from './feedback-catalog';
import {ActionsCatalog} from './actions-catalog';
import {LayoutCatalog} from './layout-catalog';
import {DisplayCatalog} from './display-catalog';
import {StructuredFormCatalog} from './structured-form-catalog';
import {FloatingCatalog} from './floating-catalog';
import {NavigationCatalog} from './navigation-catalog';
import {ChoiceCatalog} from './choice-catalog';
import {CollectionCatalog} from './collection-catalog';
import {TransferTimelineCatalog} from './transfer-timeline-catalog';
import {TreeCatalog} from './tree-catalog';
import {SchedulerCatalog} from './scheduler-catalog';
import {SpecialistCatalog} from './specialist-catalog';

bootstrapApplication(location.pathname === '/catalog/diagram-validation' ? DiagramValidationCatalog : location.pathname === '/catalog/sheet-locale' ? SheetLocaleCatalog : location.pathname === '/catalog/foundation' ? FoundationCatalog : location.pathname === '/catalog/tables' ? TableCatalog : location.pathname === '/catalog/media' ? MediaCatalog : location.pathname === '/catalog/trees' ? TreeCatalog : location.pathname === '/catalog/scheduler' ? SchedulerCatalog : location.pathname === '/catalog/specialist' ? SpecialistCatalog : location.pathname === '/catalog/transfers' ? TransferTimelineCatalog : location.pathname === '/catalog/collections' ? CollectionCatalog : location.pathname === '/catalog/choices' ? ChoiceCatalog : location.pathname === '/catalog/navigation' ? NavigationCatalog : location.pathname === '/catalog/floating' ? FloatingCatalog : location.pathname === '/catalog/forms' ? StructuredFormCatalog : location.pathname === '/catalog/display' ? DisplayCatalog : location.pathname === '/catalog/feedback' ? FeedbackCatalog : location.pathname === '/catalog/actions' ? ActionsCatalog : location.pathname === '/catalog/layout' ? LayoutCatalog : location.pathname === '/catalog' ? CatalogFixture : FixtureApp, {providers:[provideUiIcons(LucideFolder)]}).then(ref => {if(location.pathname==='/catalog/foundation')Object.defineProperty(globalThis,'__stage',{value:ref.components[0].instance,configurable:true});if(location.pathname==='/catalog/media'){Object.defineProperty(globalThis,'__mediaCatalog',{value:ref.components[0].instance,configurable:true});Object.defineProperty(globalThis,'__mediaApplication',{value:ref,configurable:true});Object.defineProperty(globalThis,'__mediaDecodeCanvas',{value:decodeCanvas,configurable:true});}
if(location.pathname==='/catalog/transfers')Object.defineProperty(globalThis,'__collectionTransfers',{value:ref.components[0].instance,configurable:true});}).catch((error: unknown) => {
  console.error(error);
  document.body.textContent = '検証アプリを開始できませんでした。ブラウザーのコンソールを確認してください。';
});
