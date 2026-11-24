import { Component } from '@angular/core';
import { LucideDynamicIcon, LucideFolder, provideLucideConfig, provideLucideIcons } from '@lucide/angular';
import { Icon } from './foundation/angular/icons';
import { provideUiIcons, provideUiLucideInterop } from './foundation/angular/icons/lucide';

@Component({
  selector: 'consumer-native-icon-child',
  imports: [Icon],
  providers: [
    provideLucideIcons({ name: 'child', aliases: ['shared'], node: [['rect', { width: '9', height: '6' }]] }),
    provideLucideConfig({ color: '#123456', size: 36, strokeWidth: 3, nonScalingStroke: true }),
  ],
  template: '<ui-icon id="interop-child" name="shared" />',
})
class NativeChild {}

@Component({
  selector: 'consumer-shared-icon-registry',
  imports: [Icon, LucideDynamicIcon, NativeChild],
  providers: [
    provideLucideIcons(LucideFolder),
    provideUiIcons({ name: 'parent', aliases: ['shared'], node: [['circle', { cx: '8', cy: '8', r: '3' }]] }),
  ],
  template: `
    <svg id="interop-raw" lucideIcon="shared"></svg>
    <ui-icon id="interop-parent" name="shared" />
    <consumer-native-icon-child />
  `,
})
class SharedRegistry {}

@Component({
  selector: 'consumer-existing-lucide-provider',
  imports: [Icon],
  providers: [provideLucideIcons(LucideFolder), provideUiLucideInterop()],
  template: '<ui-icon id="interop-external" name="folder" />',
})
class ExistingLucideProvider {}

@Component({
  selector: 'consumer-icon-interop',
  imports: [SharedRegistry, ExistingLucideProvider],
  template: '<consumer-shared-icon-registry /><consumer-existing-lucide-provider />',
})
export class IconInteropFixture {}
