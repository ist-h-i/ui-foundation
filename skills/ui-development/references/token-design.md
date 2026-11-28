# Token design and comparison

Define concrete values in primitives and purposes in semantic tokens. For example, define `blue-700` and `green-700`, then reference one from `color.action`. Different profiles can assign different values to the same role. Focus, selection, warnings and destructive actions have different meanings from the primary action; keep their roles separate even when a visual design uses similar colors.

Use native heading levels to describe the document structure. If the installed version exposes `text.page-title`, `text.section-title` and `text.subheading`, assign a visual role independently. Use the existing profile-controlled gaps within and between groups, and check the result at narrow widths and enlarged text. Leave existing app mappings in place when updating.

`color.action` is an action background; `color.link` is navigation and breadcrumb link text; `color.tab-selected` is selected-tab text and its underline. Keep distinct roles even when they reference the same primitive. Check links against both surface/background and selected tabs against surface. Do not reuse a bright action background as link text without verifying the text/background pair. Wrap long item names within components and retain their text at narrow widths and enlarged text sizes.

A guided task and daily comparison of the same list may need different information priorities as well as different typography and spacing. Base that decision on the task and context, rather than user demographics alone. Verify that both designs support the same task. Compact layouts must retain decision information, usable targets, error explanations and recovery methods.

After generation, inspect the browser's computed styles to confirm semantic values are applied. With nested profiles, inspect hover, focus, pending, error, missing-information and enlarged-text states in both scopes. A color-pair calculation establishes only the tested color relationship; it does not establish user understanding, business correctness or accessibility as a whole. See the [full design contract](../../../docs/design.en.md).
