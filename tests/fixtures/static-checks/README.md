# Static-check regression data

These 11 files are the minimal historical inputs read by the reasoned-exception,
geometry-exception, and form-label-cap regressions. They preserve the reviewed
diagnostic sites, producer/helper digests, reasons, and raw report bytes.

Only four `source_report` paths in copied JSON were relocated. The raw reports
and all other copied values remain unchanged. `prior` and similar fields record
historical provenance; the tests do not load those earlier work directories.

Keep the actual producer/helper hash guards and exact exception cardinality
checks. These fixtures do not certify current runtime behavior. Current warning
reviews are in `docs/ui-warning-reviews.json` and are checked separately.
