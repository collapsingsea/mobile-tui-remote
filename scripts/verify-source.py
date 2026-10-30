#!/usr/bin/env python3
"""Verify preserved snapshots, optionally against the original source ZIP."""

import argparse
import hashlib
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--original-zip", type=Path,
                        help="Original mobile-tui-remote-v0.2.0-with-history.zip")
    args = parser.parse_args()
    record = json.loads((ROOT / "docs/source-provenance.json").read_text())
    expected = record["original_upload"]["files_sha256"]
    archived = {p: digest for p, digest in expected.items()
                if p.startswith(("history/frontends/", "history/backends/"))}
    actual_paths = {p.relative_to(ROOT).as_posix()
                    for folder in ("history/frontends", "history/backends")
                    for p in (ROOT / folder).iterdir() if p.is_file()}
    if len(archived) != 14 or actual_paths != set(archived):
        raise ValueError("Archived snapshot inventory differs from the source record")
    for path, digest in archived.items():
        if sha256((ROOT / path).read_bytes()) != digest:
            raise ValueError(f"Archived snapshot changed: {path}")
    print("PASS all 14 archived source snapshots match the original upload hashes")
    if args.original_zip:
        original = record["original_upload"]
        if sha256(args.original_zip.read_bytes()) != original["sha256"]:
            raise ValueError("Original ZIP SHA-256 does not match the source record")
        with zipfile.ZipFile(args.original_zip) as z:
            names = [entry.filename for entry in z.infolist() if not entry.is_dir()]
            prefix = "mobile-tui-remote/"
            if len(names) != len(expected) or set(names) != {prefix + p for p in expected}:
                raise ValueError("Original ZIP file inventory differs from the source record")
            for path, digest in expected.items():
                if sha256(z.read(prefix + path)) != digest:
                    raise ValueError(f"Original ZIP entry differs: {path}")
        print(f"PASS original ZIP and all {len(expected)} source entries match the source record")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(f"FAIL {error}", file=sys.stderr)
        sys.exit(1)
