"""Byte verification and transport for the two committed runtime proof packs."""
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import stat
import sys
import tarfile


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative_name(value):
    require(isinstance(value, str) and value, "Empty or non-string payload path")
    require(not any(ord(char) < 32 for char in value), "Control character in payload path")
    require("\\" not in value and ":" not in value, "Non-portable payload path: " + value)
    path = PurePosixPath(value)
    require(not path.is_absolute() and all(part not in ("", ".", "..") for part in value.split("/")),
            "Unsafe payload path: " + value)
    require(str(path) == value, "Non-canonical payload path: " + value)
    return value


def json_value(data):
    def pairs(rows):
        result = {}
        for key, value in rows:
            require(key not in result, "Duplicate JSON key: " + key)
            result[key] = value
        return result
    def invalid(value):
        raise ValueError("Non-finite JSON value: " + value)
    return json.loads(data, object_pairs_hook=pairs, parse_constant=invalid)


def read_regular(path):
    info = path.lstat()
    require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1,
            "Payload must be a regular file without symlinks or hardlinks: " + path.name)
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(descriptor, "rb") as source:
        opened = os.fstat(source.fileno())
        require((opened.st_dev, opened.st_ino) == (info.st_dev, info.st_ino) and opened.st_nlink == 1,
                "Payload changed while opening: " + path.name)
        data = source.read()
    require(len(data) == info.st_size, "Payload changed while reading: " + path.name)
    return data


def cli(entry, kind, manifest_name):
    parser = argparse.ArgumentParser(description="Verify and re-export an existing historical " + kind + " proof pack; no native tests or review renewal.")
    parser.add_argument("--repo", type=Path, default=Path(entry).resolve().parents[2])
    parser.add_argument("--source-pack", type=Path)
    parser.add_argument("--manifest", default=manifest_name, choices=[manifest_name])
    parser.add_argument("--manifest-sha256", required=True)
    parser.add_argument("--transport-metadata-sha256")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.source_pack = args.source_pack or args.repo / "docs/verification/ui-runtime-improvements" / kind
    return args


def verified_pack(args):
    source = Path(os.path.abspath(args.source_pack))
    output = Path(os.path.abspath(args.output))
    require(source.is_dir() and not source.is_symlink(), "Source pack must be a real directory")
    require(not os.path.lexists(output), "Output already exists; refusing overwrite")
    source_real, output_real = source.resolve(), output.resolve()
    require(source_real not in output_real.parents and output_real not in source_real.parents and source_real != output_real,
            "Source and output overlap")
    require(output.parent.is_dir(), "Output parent directory must exist")
    require(re.fullmatch(r"[0-9a-f]{64}", args.manifest_sha256) is not None, "Expected manifest SHA256 must be lowercase hexadecimal")
    manifest_bytes = read_regular(source / args.manifest)
    require(digest(manifest_bytes) == args.manifest_sha256, "Manifest SHA256 mismatch")
    manifest = json_value(manifest_bytes)
    require(isinstance(manifest, dict) and isinstance(manifest.get("files"), list), "Invalid pack manifest")
    require(isinstance(manifest.get("scope"), str) and manifest["scope"], "Missing historical scope")
    rows, names, total = manifest["files"], set(), 0
    payload = {args.manifest: manifest_bytes}
    folded = {args.manifest.casefold()}
    for row in rows:
        require(isinstance(row, dict), "Invalid manifest row")
        name = relative_name(row.get("path"))
        require(name != args.manifest and name != "ROOT-ADOPTION.json" and name.casefold() not in folded,
                "Duplicate or reserved payload path: " + name)
        require(type(row.get("bytes")) is int and row["bytes"] >= 0, "Invalid byte count: " + name)
        require(isinstance(row.get("sha256"), str) and re.fullmatch(r"[0-9a-f]{64}", row["sha256"]), "Invalid payload SHA256: " + name)
        names.add(name)
        folded.add(name.casefold())
        total += row["bytes"]
    require(type(manifest.get("fileCount")) is int and manifest["fileCount"] == len(rows), "Manifest fileCount mismatch")
    require(type(manifest.get("totalBytes")) is int and manifest["totalBytes"] == total, "Manifest totalBytes mismatch")
    adoption = source / "ROOT-ADOPTION.json"
    has_adoption = os.path.lexists(adoption)
    require(bool(args.transport_metadata_sha256) == has_adoption,
            "ROOT-ADOPTION.json requires --transport-metadata-sha256, and that flag requires the file")
    if has_adoption:
        require(re.fullmatch(r"[0-9a-f]{64}", args.transport_metadata_sha256) is not None, "Invalid metadata SHA256")
        metadata_bytes = read_regular(adoption)
        require(digest(metadata_bytes) == args.transport_metadata_sha256, "Transport metadata SHA256 mismatch")
        metadata = json_value(metadata_bytes)
        require(metadata.get("sourceManifest") == args.manifest and metadata.get("sourceManifestSha256") == args.manifest_sha256
                and metadata.get("artifactCountExcludingManifest") == manifest["fileCount"]
                and metadata.get("scope") == manifest["scope"] and metadata.get("copiedAndRehashed") is True,
                "Captured transport metadata disagrees with source manifest")
        payload["ROOT-ADOPTION.json"] = metadata_bytes
    allowed = names | set(payload)
    found = set()
    allowed_directories = {str(parent) for name in allowed for parent in PurePosixPath(name).parents if str(parent) != "."}
    for directory, directories, files in os.walk(source, followlinks=False):
        for name in directories:
            path = Path(directory) / name
            require(stat.S_ISDIR(path.lstat().st_mode), "Symlink or special directory in source pack")
            require(path.relative_to(source).as_posix() in allowed_directories, "Unlisted directory in source pack")
        for name in files:
            path = Path(directory) / name
            relative = path.relative_to(source).as_posix()
            require(relative in allowed, "Unlisted file in source pack: " + relative)
            require(stat.S_ISREG(path.lstat().st_mode) and path.lstat().st_nlink == 1, "Symlink, hardlink or special file in source pack: " + relative)
            found.add(relative)
    require(found == allowed, "Missing listed payload files")
    for row in rows:
        data = read_regular(source / row["path"])
        require(len(data) == row["bytes"] and digest(data) == row["sha256"], "Payload byte count or SHA256 mismatch: " + row["path"])
        payload[row["path"]] = data
    return output, manifest, payload


def verify_reference(payload, name, sha256, byte_count=None):
    name = relative_name(name)
    require(name in payload, "Historical reference absent from pack: " + name)
    require(digest(payload[name]) == sha256 and (byte_count is None or len(payload[name]) == byte_count),
            "Historical reference disagrees with payload: " + name)


def transport(args, validate_scope):
    output, manifest, payload = verified_pack(args)
    scope_checks = validate_scope(manifest, payload)
    # All input validation precedes creation. mkdir is exclusive even if another
    # process creates the target after validation. Never reuse or replace it.
    output.mkdir()
    destination = output / "payload"
    destination.mkdir()
    for name, data in sorted(payload.items()):
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as stream:
            stream.write(data)
    archive = output / "payload.tar.gz"
    with archive.open("xb") as file:
        with gzip.GzipFile(filename="", mode="wb", fileobj=file, mtime=0) as compressed:
            with tarfile.open(mode="w", fileobj=compressed, format=tarfile.PAX_FORMAT) as tar:
                for name, data in sorted(payload.items()):
                    member = tarfile.TarInfo(name)
                    member.size, member.mode, member.mtime = len(data), 0o644, 0
                    tar.addfile(member, io.BytesIO(data))
    with tarfile.open(archive, "r:gz") as tar:
        members = tar.getmembers()
        require(len(members) == len(payload) and {member.name for member in members} == set(payload), "Transport tar inventory mismatch")
        for member in members:
            require(member.isfile() and tar.extractfile(member).read() == payload[member.name], "Transport tar bytes mismatch")
    for name, data in payload.items():
        require(read_regular(destination / name) == data, "Exported payload bytes mismatch: " + name)
    receipt = {
        "schema": 1, "operation": "verified-historical-evidence-transport",
        "createdUtc": datetime.now(timezone.utc).isoformat(),
        "scope": manifest["scope"], "sourceManifest": args.manifest,
        "sourceManifestSha256": args.manifest_sha256,
        "capturedTransportMetadataSha256": args.transport_metadata_sha256,
        "listedArtifactCount": manifest["fileCount"], "listedArtifactBytes": manifest["totalBytes"],
        "payloadFileCount": len(payload), "payloadBytes": sum(map(len, payload.values())),
        "payload": [{"path": name, "bytes": len(data), "sha256": digest(data)} for name, data in sorted(payload.items())],
        "archive": {"path": "payload.tar.gz", "bytes": archive.stat().st_size, "sha256": digest(archive.read_bytes())},
        "historicalScopeChecks": scope_checks,
        "historicalNativeResultsReexecuted": False, "historicalReviewDecisionsRenewed": False,
        "currentUiVerificationPerformed": False,
        "runtime": {"python": sys.version, "platform": platform.system(), "architecture": platform.machine()},
    }
    with (output / "transport-receipt.json").open("x", encoding="utf-8") as file:
        json.dump(receipt, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps({"operation": receipt["operation"], "listedArtifacts": manifest["fileCount"], "payloadFiles": len(payload)}))


def main(args, validator):
    try:
        transport(args, validator)
    except (OSError, ValueError, TypeError, KeyError, tarfile.TarError) as error:
        print("Evidence transport refused: " + str(error), file=sys.stderr)
        return 1
    return 0
