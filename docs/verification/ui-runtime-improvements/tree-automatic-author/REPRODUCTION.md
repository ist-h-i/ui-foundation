# Portable Tree followup pack

The archive contains the exact new two-file test candidate, unchanged product templates/configuration and a Tree-only generated consumer snapshot, before/final actual evidence, retained harness failures, historical original traces, and per-node classification. No node_modules, credentials, host settings, or other project data are included.

`candidate/tests/ui/` is the proposed permanent change. The same bytes were run as `repository/tests/ui/` and retained in `evidence/automatic-keyboard-final/source/`. Apply only these two new files to the product repository for independent review; no product template patch is proposed. `candidate/patches/` contains new-file unified diffs. All axe rules in the existing formal Tree case remain enabled.

`MANIFEST.json` and `MANIFEST.sha256` list hashes and byte lengths for every payload file, excluding the manifests themselves. The external archive receipt records the SHA of the archive and both manifests. Archive verification checks every tar member against the manifest, rejects symlinks and unexpected entries, and checks 42 evidence references and their SHA before packaging.

Reproduce in a new extracted directory. Dependencies are intentionally excluded. Use the supplied exact `package-lock.json` with Node 24.19; the measured environment used Angular/CDK 22.2.1, TypeScript 6.0.3, Playwright 1.63.0 and axe-core 4.13.0. Installing dependencies or missing browsers is a separate environment setup operation, not an operation performed by these tests. The author's run reused the already installed exact dependency tree and Chromium without any downloads.

From `repository/`, use these sequential commands with a fresh evidence output directory (to preserve all retained results):

```sh
mkdir -p ../rerun/build ../rerun/native
node_modules/.bin/tsx src/cli.ts sync --config examples/ui.config.example.yaml
node_modules/.bin/tsx src/cli.ts check --config examples/ui.config.example.yaml
node_modules/.bin/ngc -p tsconfig.json
REVIEW_EVIDENCE=../rerun/build node scripts/build.mjs
node_modules/.bin/tailwindcss -i tests/fixture-app/styles.css -o dist/fixture-app/styles.css
node_modules/.bin/tsc --ignoreConfig --noEmit --skipLibCheck --strict --types node --target ES2022 --module ESNext --moduleResolution bundler tests/ui/tree-axe-contract-helpers.ts tests/ui/tree-axe-contract.spec.ts
REPORT_JSON=../rerun/native/results.json REPORT_DIR=../rerun/native/test-results node node_modules/@playwright/test/cli.js test tests/ui/tree-axe-contract.spec.ts
```

The pack's Playwright config uses one Chromium worker, retries zero, trace on, and its own server on 127.0.0.1:5338. It rejects reuse of an existing server. Only start it when that port is unused; stop only the server started by this run. The static Tree consumer `repository/dist/fixture-app/` is also retained byte-for-byte as runtime evidence. CDP/native AX and platform font evidence are Chromium-only; a skipped non-Chromium CDP branch must not be reported as an AX pass.

To rerun the unchanged original formal narrow case, use a separate fresh output directory and the same test command with `tests/ui/tree-catalog.spec.ts --grep '320px/200%/RTL/reduced motion and axe closed/open popups'`. No rule suppression is needed or permitted. `evidence/before/axe-summary.json` reports zero violations and 42 unresolved axe nodes. Complementary final tests add evidence without modifying that result.

The read-only AT availability observation is preserved in `evidence/real-at-availability.json`; VoiceOver was not launched and speech was not captured. Do not change OS settings or request Accessibility permissions as part of reproduction. Human visual checking is outside the completion criteria for this task. The two-file candidate still requires the parent's independent critic; this pack is the author's evidence, not independent approval.
