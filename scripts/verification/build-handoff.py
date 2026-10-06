"""Re-export the committed Media/Tree handoff without renewing its verdict."""
import sys
sys.dont_write_bytecode = True
from evidence_pack import cli, json_value, main, require, verify_reference


def validate_handoff(manifest, payload):
    for name in ("VERDICT.json", "REVIEW.ja.md", "REPRODUCTION.md", "candidate/media-author-manifest.json"):
        require(name in payload, "Not the committed Media/Tree handoff: missing " + name)
    verdict = json_value(payload["VERDICT.json"])
    require(isinstance(verdict.get("decisions"), dict) and isinstance(verdict.get("recordedUtc"), str), "Missing historical handoff decision metadata")
    verify_reference(payload, "candidate/media-author-manifest.json", verdict["mediaManifestSHA256"])
    references = 0
    for row in verdict["media6"]:
        verify_reference(payload, "candidate/" + row["path"], row["afterSHA256"], row["afterBytes"])
        references += 1
        if row["beforeSHA256"] is not None:
            verify_reference(payload, "reference-base/" + row["path"], row["beforeSHA256"], row["beforeBytes"])
            references += 1
    for row in verdict["tree2"]:
        verify_reference(payload, "candidate/" + row["path"], row["sha256"], row["bytes"])
        references += 1
    return {"kind": "media-tree-independent", "historicalSourceReferencesChecked": references,
            "recordedDecisionBytesPreserved": True, "reviewReexecuted": False}


if __name__ == "__main__":
    sys.exit(main(cli(__file__, "media-tree-independent", "PACK-MANIFEST.json"), validate_handoff))
