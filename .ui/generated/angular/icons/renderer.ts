import { booleanAttribute, ChangeDetectionStrategy, Component, computed, Directive, inject, input } from '@angular/core';
import { UI_ICON_FALLBACKS, UI_ICON_LUCIDE, UI_ICON_REGISTRY, type UiIconAttributes, type UiIconNode } from './registry';

/** The shared presentation attributes accepted by Lucide's seven SVG primitives. */
@Directive({
  selector: '[uiIconPaint]',
  standalone: true,
  host: {
    '[attr.class]': "attributes()['class']",
    '[attr.id]': "attributes()['id']",
    '[attr.opacity]': "attributes()['opacity']",
    '[attr.stroke]': "attributes()['stroke']",
    '[attr.stroke-opacity]': "attributes()['stroke-opacity']",
    '[attr.fill]': "attributes()['fill']",
    '[attr.fill-opacity]': "attributes()['fill-opacity']",
    '[attr.vector-effect]': "attributes()['vector-effect']",
  },
})
class IconPaint {
  readonly attributes = input.required<UiIconAttributes>({ alias: 'uiIconPaint' });
}

@Component({
  selector: 'ui-icon',
  standalone: true,
  imports: [IconPaint],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-size]': 'size()',
    '[attr.data-severity]': 'severity()',
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
  },
  template: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round"
      focusable="false" [attr.viewBox]="viewBox()" [attr.width]="config.size" [attr.height]="config.size"
      [attr.stroke]="config.color" [attr.stroke-width]="strokeWidth()" [attr.class]="classes()"
      [attr.role]="decorative() ? null : 'img'" [attr.aria-label]="title()" [attr.aria-hidden]="decorative()">
    @if (title(); as text) { <svg:title>{{ text }}</svg:title> }
    @for (child of children(); track $index) {
      @let a = child[1];
      @switch (child[0]) {
        @case ('path') { <svg:path [uiIconPaint]="a" [attr.d]="a['d']" /> }
        @case ('circle') { <svg:circle [uiIconPaint]="a" [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.r]="a['r']" /> }
        @case ('line') { <svg:line [uiIconPaint]="a" [attr.x1]="a['x1']" [attr.y1]="a['y1']" [attr.x2]="a['x2']" [attr.y2]="a['y2']" /> }
        @case ('rect') { <svg:rect [uiIconPaint]="a" [attr.x]="a['x']" [attr.y]="a['y']" [attr.width]="a['width']" [attr.height]="a['height']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" /> }
        @case ('ellipse') { <svg:ellipse [uiIconPaint]="a" [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" /> }
        @case ('polygon') { <svg:polygon [uiIconPaint]="a" [attr.points]="a['points']" /> }
        @case ('polyline') { <svg:polyline [uiIconPaint]="a" [attr.points]="a['points']" /> }
      }
    }
  </svg>`,
  styles: `
    :host { display:inline-flex; inline-size:var(--ui-size-icon); block-size:var(--ui-size-icon); flex:0 0 auto; vertical-align:middle; color:inherit; }
    :host([hidden]) { display:none; }
    :host([data-size="small"]) { inline-size:calc(var(--ui-size-icon)*0.75); block-size:calc(var(--ui-size-icon)*0.75); }
    :host([data-size="large"]) { inline-size:calc(var(--ui-size-icon)*1.5); block-size:calc(var(--ui-size-icon)*1.5); }
    :host([data-severity="muted"]) { color:var(--ui-color-muted); }
    :host([data-severity="info"]) { color:var(--ui-color-text); }
    :host([data-severity="success"]) { color:var(--ui-color-success); }
    :host([data-severity="warning"]) { color:var(--ui-color-warning); }
    :host([data-severity="danger"]) { color:var(--ui-color-danger); }
    svg { inline-size:100%; block-size:100%; color:inherit; }
  `,
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input<'small' | 'medium' | 'large'>('medium');
  readonly severity = input<'inherit' | 'muted' | 'info' | 'success' | 'warning' | 'danger'>('inherit');
  readonly decorative = input(true, { transform: booleanAttribute });
  readonly label = input<string | null>(null);

  private readonly lucide = inject(UI_ICON_LUCIDE, { optional: true });
  private readonly registry = this.lucide?.readIcons() ?? inject(UI_ICON_REGISTRY);
  private readonly fallbacks = inject(UI_ICON_FALLBACKS, { optional: true });
  protected readonly config = this.lucide?.readConfig() ?? {
    color: 'currentColor', size: 24, strokeWidth: 2, nonScalingStroke: false, absoluteStrokeWidth: false,
  };

  private readonly data = computed(() => {
    const name = this.name();
    if (!name.trim()) throw new Error('ui-icon name must be nonempty.');
    if (Object.hasOwn(this.registry, name)) return this.registry[name];
    if (this.fallbacks && Object.hasOwn(this.fallbacks, name)) return this.fallbacks[name];
    throw new Error(`Unable to resolve icon '${name}'`);
  });
  protected readonly title = computed(() => {
    if (this.decorative()) return null;
    const label = this.label();
    if (!label?.trim()) throw new Error('Informative ui-icon requires a nonempty label.');
    return label;
  });
  protected readonly viewBox = computed(() => {
    const { size, width, height } = this.data();
    return `0 0 ${size ?? width ?? 24} ${size ?? height ?? 24}`;
  });
  protected readonly strokeWidth = computed(() => {
    const { absoluteStrokeWidth, strokeWidth, size } = this.config;
    return absoluteStrokeWidth ? strokeWidth * (this.data().size ?? this.data().width ?? 24) / Number(size) : strokeWidth;
  });
  protected readonly classes = computed(() => {
    const { name, aliases = [] } = this.data();
    return ['lucide', ...new Set([name, ...aliases].filter(part => part.trim()).map(part => `lucide-${part}`))].join(' ');
  });
  protected readonly children = computed<readonly UiIconNode[]>(() => {
    const { node } = this.data();
    return this.config.nonScalingStroke
      ? node.map(([tag, attributes]) => [tag, { 'vector-effect': 'non-scaling-stroke', ...attributes }] as const)
      : node;
  });
}
