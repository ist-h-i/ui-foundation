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
    min-inline-size: 0;
    max-inline-size: 100%;
    color: var(--ui-color-text);
    font-family: var(--ui-font-body);
    font-size: var(--ui-text-body);
    font-weight: var(--ui-weight-body);
    line-height: var(--ui-leading-body);
  }
  .ui-navigation > ul, .ui-breadcrumb > ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-control-gap);
    margin: 0;
    padding: 0;
    list-style: none;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .ui-navigation > ul > li, .ui-breadcrumb > ol > li {
    box-sizing: border-box;
    min-inline-size: 0;
    max-inline-size: 100%;
  }
  .ui-breadcrumb > ol > li {
    display: flex;
    align-items: center;
  }
  .ui-breadcrumb > ol > li + li {
    padding-inline-start: var(--ui-space-control-gap);
    border-inline-start: var(--ui-border-control) solid var(--ui-color-border);
  }
  .ui-navigation-item {
    display: inline-flex;
    box-sizing: border-box;
    align-items: center;
    min-block-size: var(--ui-size-control);
    min-inline-size: var(--ui-size-control);
    max-inline-size: 100%;
    padding: var(--ui-space-control-y) var(--ui-space-control-x);
    border-radius: var(--ui-radius-control);
    color: var(--ui-color-link);
    text-underline-offset: var(--ui-border-focus-offset);
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .ui-navigation-item:hover {
    background: var(--ui-color-background);
    text-decoration-thickness: var(--ui-border-control);
  }
  .ui-navigation-item[aria-current="page"] {
    background: var(--ui-color-background);
    font-weight: var(--ui-weight-heading);
    text-decoration: underline;
    text-decoration-thickness: var(--ui-border-focus);
  }
  .ui-navigation-item:focus-visible {
    outline: var(--ui-border-focus) solid var(--ui-color-focus);
    outline-offset: var(--ui-border-focus-offset);
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
