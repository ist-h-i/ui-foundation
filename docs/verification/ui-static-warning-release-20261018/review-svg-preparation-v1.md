# SVG consumer preparation v1 independent review

Decision: **approve for this preparation change**. No Blocker, Major, or Minor findings. This is a source/filesystem review; full SVG acceptance and publication remain the main agent's responsibility.

## Fixed target and scope

- Repository: `/Users/inouehiroshi/Documents/GitHub/ui-foundation`; branch `feat/ui-static-warning-release`.
- Base: `469e142750a4edb5fdb995e3c2542d481774da50`. The initial dirty snapshot is now committed at `88a72c2a94f6649a935d764166d83fe6d45b2758`; all three changed source files match the frozen snapshot and committed bytes.
- Changed files: `scripts/test-svg-paint.mjs`, new `scripts/verification/prepare-svg-consumer.mjs`, `tests/verification-tools/portable.test.mjs`. The base-to-current-head change set is exactly these three files.
- Snapshot SHA-256: `a88b8a9060399c88e3f4598ca5e027efb85fad789cb12dc31429b80b57923368`; tar SHA-256: `7916196fd89eace69903f6094e76aaa71afb09e91a3ff0f158b52ec4f7f56a30`; patch SHA-256: `581d63f69824d6cc0659334d70cd0ab3d98cc80554d7760b5b7cefa35556e21e`.
- The 14 manifest files match their recorded SHA-256 in both the live tree and immutable tar at the initial and final checks. Snapshot JSON itself also matches its tar member. See `review-svg-preparation-v1/initial-integrity.json` and `review-svg-preparation-v1/final-integrity.json`.

## Evidence and assessment

`prepare-svg-consumer.mjs:10-21` preserves the previous source-copy, byte-digest, dependency-version, and node_modules-link behavior, while adding full `tests/fixture-app` and root `tsconfig.json`. The helper is used by the actual runner and regression test. Config, exception policy, templates, consumer fixtures, and public contracts are unchanged by this patch. The optional CLI root expression and fixture root expression remain unchanged in `test-svg-paint.mjs:10-11`.

The independent filesystem probe verified exactly 229 inventoried source files (2,752,350 bytes), all 50 exact installed dependency versions, and all 6 public consumer fixture files. The two configured roots contain 56 fixture files and 146 Angular template files; all 202 source files and the 334 exceptions' 82 distinct file anchors are represented in the inventory, as is configured `tsconfig.json`. No public fixture path overwrites a canonical source input. The prepared work tree contains only the expected regular files and a node_modules symlink; actual copied source trees contain no symlink entries.

The new regression (`portable.test.mjs:26-68`) reads canonical YAML independently of the helper's hardcoded copy lists, checks file bytes and inventory hashes/sizes for all configured inputs, and checks every public fixture file. It registers cleanup before calling the helper. The supplied red log has the recorded digest and shows ENOENT for both the previously missing tsconfig and a fixture source; the supplied green log also matches its recorded digest. These make the test sensitive to the reported input omissions. The reviewer reran only this focused test.

The 5,274 bytes from the source-input record through EOF in `test-svg-paint.mjs` are byte-identical to the base (SHA-256 `f46aa69eecbc41b6545e35f435665245ae420f7fe38aeb7190d8cce6aa2998d3`). This preserves canonical sync/check/idempotency/dry-run, public-consumer production build, all 34 distinct native scenario and per-row/error assertions, filter environment removal, source-unchanged finally checks, and owned-server close logic. See `review-svg-preparation-v1/tail-integrity.json`.

A synthetic filesystem probe observed `ERR_ASSERTION` for an installed dependency version mismatch. Removing its work directory recursively unlinked the node_modules symlink while preserving the external synthetic dependency bytes. The actual focused test's temporary work was removed. The helper retains the existing setup-failure semantics: it does not claim success or suppress read/copy/version errors, and the runner's existing temporary-work preservation remains unchanged.

## Commands and raw results

All commands ran from the repository on Node v24.19.0. Test TMPDIR was set to the review-owned `review-svg-preparation-v1/tmp` directory. No source or Git state was modified by this reviewer.

| Command | Exit | Result / raw record |
|---|---:|---|
| `node --test --test-name-pattern='SVG consumer preparation' tests/verification-tools/portable.test.mjs` | 0 | tests 4, pass 4, fail 0, cancelled 0, skipped 0; `review-svg-preparation-v1/command-1.log` |
| `node --check scripts/test-svg-paint.mjs` | 0 | no stdout/stderr; `review-svg-preparation-v1/command-2.log` |
| `node --check scripts/verification/prepare-svg-consumer.mjs` | 0 | no stdout/stderr; `review-svg-preparation-v1/command-3.log` |
| `node --check tests/verification-tools/portable.test.mjs` | 0 | no stdout/stderr; `review-svg-preparation-v1/command-4.log` |
| `git diff --check 469e142750a4edb5fdb995e3c2542d481774da50 -- scripts/test-svg-paint.mjs scripts/verification/prepare-svg-consumer.mjs tests/verification-tools/portable.test.mjs` | 0 | no stdout/stderr; `review-svg-preparation-v1/command-5.log` |
| `node docs/verification/ui-static-warning-release-20261018/review-svg-preparation-v1/filesystem-probe.mjs` | 0 | 6 filesystem assertions; `review-svg-preparation-v1/filesystem-probe.log` |
| Python SHA-256 comparison of 14 live/tar files and three metadata inputs, before and after review | 0 | all 14 match, metadata hashes match; initial/final-integrity JSON |
| Python byte comparison of runner execution tail against exact base | 0 | identical 5,274 bytes; tail-integrity JSON |
| Python digest check/read of supplied red and green logs | 0 | both recorded digests match; red/green command exits remain worker-reported |

Exact argv, cwd, environment, exits, raw stdout/stderr and log SHA-256 for the reviewer-run unit/syntax/whitespace commands are in `review-svg-preparation-v1/commands.json`; the custom probe's source hash and raw output are in `review-svg-preparation-v1/filesystem-probe-receipt.json`.

## Limits

No reviewer build, browser, canonical CLI generation/check, complete test:verification run, native 34-scenario run, or full npm test was executed. Filesystem success does not establish compilation or rendered native success. The review is bounded to the frozen preparation patch and current canonical inputs; arbitrary alternate configurations and concurrent writers are not asserted. No sub-agents were used. No source corrections are requested.
