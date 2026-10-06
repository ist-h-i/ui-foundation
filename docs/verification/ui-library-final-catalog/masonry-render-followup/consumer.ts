import {bootstrapApplication} from '@angular/platform-browser';
import {CollectionCatalog} from '../repository/tests/fixture-app/collection-catalog';
import {provideUiIcons} from '../repository/.ui/generated/angular/index';
import {LucideFolder} from '@lucide/angular';
bootstrapApplication(CollectionCatalog,{providers:[provideUiIcons(LucideFolder)]})
  .then(ref=>Object.defineProperty(globalThis,'__masonryFixture',{value:ref.components[0].instance,configurable:true}))
  .catch(error=>{console.error(error);document.body.textContent='Independent Masonry fixture failed to boot.';});
