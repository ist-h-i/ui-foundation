"""Re-export the committed cross-browser proof without rerunning its phases."""
import sys
sys.dont_write_bytecode = True
from evidence_pack import cli, json_value, main, require, verify_reference


def validate_cross_browser(manifest, payload):
    require(manifest.get("schema") == 1 and "proof-scope.json" in payload and "README.ja.md" in payload,
            "Not the committed cross-browser proof pack")
    scope = json_value(payload["proof-scope.json"])
    require(scope.get("schema") == 1 and scope.get("immutableDirectory") == manifest.get("immutableDirectory"), "Cross-browser historical scope disagrees with manifest")
    phases = scope["authorNativePhases"]
    require(isinstance(phases, list) and len(phases) == 4, "Missing historical cross-browser phases")
    for phase in phases:
        result = json_value(payload[phase["rawResult"]])
        receipt = json_value(payload[phase["receipt"]])
        exit_code = int(payload[phase["rawExit"]].decode("ascii").strip())
        require(result["stats"] == phase["stats"] and exit_code == phase["actualExit"]
                and receipt["native"]["code"] == exit_code and receipt["bundleSha256"] == phase["bundleSha256"],
                "Historical phase metadata disagrees with raw evidence: " + phase["name"])
        for key in ("menuSource", "actualSpec"):
            verify_reference(payload, phase[key]["path"], phase[key]["sha256"])
    verify_reference(payload, "candidate/templates/angular/menu.ts", scope["menuFinalSha256"])
    return {"kind": "cross-browser-author", "historicalPhasesChecked": len(phases),
            "historicalExits": [phase["actualExit"] for phase in phases], "nativePhasesReexecuted": False}


if __name__ == "__main__":
    sys.exit(main(cli(__file__, "cross-browser-author", "files-manifest.json"), validate_cross_browser))
