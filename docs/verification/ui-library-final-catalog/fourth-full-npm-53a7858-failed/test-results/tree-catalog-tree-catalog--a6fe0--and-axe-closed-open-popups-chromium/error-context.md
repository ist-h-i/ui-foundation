# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tree-catalog.spec.ts >> tree catalog dense >> 320px/200%/RTL/reduced motion and axe closed/open popups
- Location: tests/ui/tree-catalog.spec.ts:94:2

# Error details

```
Error: page.goto: Target page, context or browser has been closed
Call log:
  - navigating to "http://127.0.0.1:5187/catalog/trees", waiting until "load"

```

```
Error: apiRequestContext._wrapApiCall: Target page, context or browser has been closed
```