/** These foreground/surface pairs are validated by the configuration contract. */
export const displayStyles = `
:host{box-sizing:border-box;min-inline-size:0;max-inline-size:100%;font-family:var(--ui-font-body);font-size:var(--ui-text-body);line-height:var(--ui-leading-body);color:var(--ui-color-text);}
:host([hidden]){display:none;}
.ui-display-tone{color:var(--ui-color-text);background:var(--ui-color-surface);}
.ui-display-tone[data-tone="muted"]{color:var(--ui-color-muted);}
.ui-display-tone[data-tone="info"]{color:var(--ui-color-link);}
.ui-display-tone[data-tone="success"]{color:var(--ui-color-success);background:var(--ui-color-success-surface);}
.ui-display-tone[data-tone="warning"]{color:var(--ui-color-warning);background:var(--ui-color-warning-surface);}
.ui-display-tone[data-tone="error"]{color:var(--ui-color-danger);background:var(--ui-color-error-surface);}
button,summary{font:inherit;color:inherit;min-block-size:var(--ui-size-control);cursor:pointer;overflow-wrap:anywhere;}
button{border:var(--ui-border-control) solid var(--ui-color-border);border-radius:var(--ui-radius-control);padding:var(--ui-space-control-y) var(--ui-space-control-x);background:var(--ui-color-surface);}
button:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:var(--ui-border-focus) solid var(--ui-color-focus);outline-offset:var(--ui-border-focus-offset);}
button:disabled{color:var(--ui-color-muted);background:var(--ui-color-disabled-surface);cursor:default;}
`;
