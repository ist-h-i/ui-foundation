# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: diagram-controlled-validation.spec.ts >> dense: Diagram rejection retains app model, selection, raw input, focused DOM and live locale/profile presentation
- Location: tests/ui/diagram-controlled-validation.spec.ts:14:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'フロー編集の検証', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'フロー編集の検証', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'フロー編集の検証', exact: true })

```

```yaml
- text: 検証アプリを開始できませんでした。ブラウザーのコンソールを確認してください。
```

```
Error: catalog browser runtime errors and warnings

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 22

- Array []
+ Array [
+   "error: ERROR De: NG05104: The selector \"diagram-validation-catalog\" did not match any elements. Find more at https://v22.angular.dev/errors/NG05104
+     at hX.selectRootElement (http://127.0.0.1:52053/main.js:2632:8530)
+     at rVe (http://127.0.0.1:52053/main.js:27:26775)
+     at D_.createComponentRef (http://127.0.0.1:52053/main.js:56:27424)
+     at D_.create (http://127.0.0.1:52053/main.js:56:27249)
+     at http://127.0.0.1:52053/main.js:56:83690
+     at Hv.run (http://127.0.0.1:52053/main.js:8:28060)
+     at t.bootstrapImpl (http://127.0.0.1:52053/main.js:56:83185)
+     at t.bootstrap (http://127.0.0.1:52053/main.js:56:83107)
+     at http://127.0.0.1:52053/main.js:76:27011",
+   "error: De: NG05104: The selector \"diagram-validation-catalog\" did not match any elements. Find more at https://v22.angular.dev/errors/NG05104
+     at hX.selectRootElement (http://127.0.0.1:52053/main.js:2632:8530)
+     at rVe (http://127.0.0.1:52053/main.js:27:26775)
+     at D_.createComponentRef (http://127.0.0.1:52053/main.js:56:27424)
+     at D_.create (http://127.0.0.1:52053/main.js:56:27249)
+     at http://127.0.0.1:52053/main.js:56:83690
+     at Hv.run (http://127.0.0.1:52053/main.js:8:28060)
+     at t.bootstrapImpl (http://127.0.0.1:52053/main.js:56:83185)
+     at t.bootstrap (http://127.0.0.1:52053/main.js:56:83107)
+     at http://127.0.0.1:52053/main.js:76:27011",
+ ]
```

# Test source

```ts
  1 | import {test as base,expect} from '@playwright/test';
  2 | export {expect} from '@playwright/test';
  3 | /** Catch Angular ErrorHandler failures, browser exceptions and configuration warnings. */
  4 | export const test=base.extend<{runtimeErrors:string[]}>({
> 5 |  runtimeErrors:[async({page},use)=>{const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')errors.push(message.type()+': '+message.text());});await use(errors);expect(errors,'catalog browser runtime errors and warnings').toEqual([]);},{auto:true}],
    |                                                                                                                                                                                                                                                                                                                                           ^ Error: catalog browser runtime errors and warnings
  6 | });
  7 | 
```