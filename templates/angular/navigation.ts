import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  Directive,
  input,
  ViewEncapsulation,
} from '@angular/core';

// Projection keeps native lists and links in the application. These namespaced
// styles intentionally cover projected elements without ::ng-deep.
const navigationStyles = `
  .ui-navigation, .ui-breadcrumb {
    color: var(--ui-color-text);
    font-family: var(--ui-font-family);
    font-size: var(--ui-font-body);
    line-height: var(--ui-line-height);
  }
  .ui-navigation > ul, .ui-breadcrumb > ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ui-breadcrumb > ol > li {
    display: flex;
    align-items: center;
  }
  .ui-breadcrumb > ol > li + li {
    padding-inline-start: var(--ui-space-2);
    border-inline-start: 1px solid var(--ui-color-border);
  }
  .ui-navigation-item {
    display: inline-flex;
    box-sizing: border-box;
    align-items: center;
    min-block-size: var(--ui-control-height);
    min-inline-size: var(--ui-control-height);
    padding: var(--ui-space-2) var(--ui-space-3);
    border-radius: var(--ui-radius);
    color: var(--ui-color-primary);
    text-underline-offset: var(--ui-space-1);
    white-space: nowrap;
  }
  .ui-navigation-item:hover {
    background: var(--ui-color-background);
    text-decoration-thickness: 2px;
  }
  .ui-navigation-item[aria-current="page"] {
    background: var(--ui-color-background);
    font-weight: 700;
    text-decoration: underline;
    text-decoration-thickness: 3px;
  }
  .ui-navigation-item:focus-visible {
    outline: 3px solid var(--ui-color-focus);
    outline-offset: 3px;
  }
  .ui-navigation[hidden], .ui-breadcrumb[hidden], .ui-navigation-item[hidden] {
    display: none;
  }
  @media (forced-colors: active) {
    .ui-navigation-item:focus-visible { outline-color: Highlight; }
  }
`;

@Component({
  selector: 'nav[uiNavigation]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ui-navigation', '[attr.aria-label]': 'label()' },
  template: '<ng-content />',
  styles: navigationStyles,
})
export class Navigation {
  readonly label = input.required<string>();
}

@Component({
  selector: 'nav[uiBreadcrumb]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ui-breadcrumb', '[attr.aria-label]': 'label()' },
  template: '<ng-content />',
  styles: navigationStyles,
})
export class Breadcrumb {
  readonly label = input('パンくず');
}

@Directive({
  selector: 'a[uiNavigationItem]',
  standalone: true,
  host: {
    class: 'ui-navigation-item',
    '[attr.aria-current]': 'currentPage() ? "page" : null',
  },
})
export class NavigationItem {
  readonly currentPage = input(false, { transform: booleanAttribute });
}
