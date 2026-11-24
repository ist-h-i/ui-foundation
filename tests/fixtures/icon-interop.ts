import { ChangeDetectorRef, Component, inject, input, signal } from '@angular/core';
import { LucideDynamicIcon, LucideFolder, provideLucideConfig, provideLucideIcons } from '@lucide/angular';
import { Icon, selected } from './foundation/angular/icons';
import { shape as folder } from './foundation/angular/icons/folder';
import { provideUiIcons, provideUiLucideInterop } from './foundation/angular/icons/lucide';

@Component({
  selector: 'consumer-native-icon-child',
  imports: [Icon],
  providers: [
    provideLucideIcons({ name: 'child', aliases: ['shared'], node: [['rect', { width: '9', height: '6' }]] }),
    provideLucideConfig({ color: '#123456', size: 36, strokeWidth: 3, nonScalingStroke: true }),
  ],
  template: '<ui-icon [id]="probeId()" name="shared" />',
})
class NativeChild {
  readonly probeId = input('interop-child');
}

@Component({
  selector: 'consumer-selected-icon-child',
  imports: [Icon, NativeChild],
  providers: [selected(folder, { name: 'local-mark', aliases: ['local-alias'], node: [['line', { x1: 1, y1: 2, x2: 7, y2: 6 }]] })],
  template: `
    <ui-icon id="interop-selected" [name]="name()" />
    <button id="interop-change" (click)="name.set('local-alias')">Show local icon</button>
    <button id="interop-missing" (click)="checkMissing()">Check shadowed icon</button>
    <output id="interop-missing-result">{{ message() }}</output>
    <consumer-native-icon-child probeId="interop-native-grandchild" />
  `,
})
class SelectedChild {
  protected readonly name = signal('folder');
  protected readonly message = signal('');
  private readonly changes = inject(ChangeDetectorRef);

  protected checkMissing(): void {
    this.name.set('shared');
    try {
      this.changes.detectChanges();
    } catch (error) {
      this.message.set(String(error));
    }
    this.name.set('folder');
  }
}

@Component({
  selector: 'consumer-shared-icon-registry',
  imports: [Icon, LucideDynamicIcon, NativeChild, SelectedChild],
  providers: [
    provideLucideIcons(LucideFolder),
    provideUiIcons({ name: 'parent', aliases: ['shared'], node: [['circle', { cx: '8', cy: '8', r: '3' }]] }),
  ],
  template: `
    <svg id="interop-raw" lucideIcon="shared"></svg>
    <ui-icon id="interop-parent" name="shared" />
    <consumer-native-icon-child />
    <consumer-selected-icon-child />
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
