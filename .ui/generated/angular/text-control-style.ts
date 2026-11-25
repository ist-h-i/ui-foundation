export const textControlStyles = `
  :host { display: block; min-inline-size: 0; max-inline-size: 100%; font: inherit; }
  :host([hidden]) { display: none; }
  .ui-input-group { display: flex; flex-wrap: wrap; gap: var(--ui-space-control-gap); align-items: center; min-inline-size: 0; }
  .ui-input-group input { flex: 1 1 var(--ui-size-control); min-inline-size: 0; }
  .ui-input-count, .ui-input-format { color: var(--ui-color-muted); font-size: var(--ui-text-small); margin-block: var(--ui-space-control-y); }
  textarea { resize: vertical; max-block-size: var(--ui-size-input-max-height); }
`;
