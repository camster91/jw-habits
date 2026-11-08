#!/usr/bin/env python3
"""Record source entitlement provenance for an unsigned iOS archive.

An unsigned archive cannot prove the entitlements that will be present at
runtime. This verifier records the source declarations and states the signed
export checks that remain mandatory before a store upload.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import plistlib
from pathlib import Path
from typing import Any


EXPECTED_APP_GROUP = "group.ca.ashbi.habittracker"
ENTITLEMENT_FILES = {
    "app": ("App", "ios/App/App/App.entitlements"),
    "widget": ("FaithfulDaysWidget", "ios/App/FaithfulDaysWidget/FaithfulDaysWidget.entitlements"),
}


class ValidationError(ValueError):
    """Raised when source entitlement provenance is not trustworthy."""


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_source_entitlements(
    source_root: Path, expected_group: str = EXPECTED_APP_GROUP
) -> dict[str, Any]:
    """Validate both source plist declarations and return redacted provenance."""

    if not expected_group:
        raise ValidationError("Expected App Group must not be empty")

    records: dict[str, dict[str, Any]] = {}
    for role, (target, relative_path) in ENTITLEMENT_FILES.items():
        path = source_root / relative_path
        if not path.is_file():
            raise ValidationError(f"Missing {role} entitlement file: {relative_path}")
        try:
            entitlements = plistlib.loads(path.read_bytes())
        except (OSError, plistlib.InvalidFileException) as error:
            raise ValidationError(f"Unreadable {role} entitlement file: {relative_path}") from error

        groups = entitlements.get("com.apple.security.application-groups")
        if groups != [expected_group]:
            raise ValidationError(
                f"Unexpected {role} App Groups in {relative_path}: {groups!r}"
            )
        records[role] = {
            "target": target,
            "path": relative_path,
            "sha256": _sha256(path),
            "applicationGroups": groups,
        }

    return {
        "expectedAppGroup": expected_group,
        "entitlements": records,
        "proofScope": {
            "unsignedArchive": (
                "Source entitlement declarations only; an unsigned archive does not "
                "prove runtime entitlements or signing."
            ),
            "signedExport": (
                "Before upload, verify code signatures and embedded provisioning-profile "
                "entitlements for both App.app and FaithfulDaysWidget.appex, including "
                "the expected App Group."
            ),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-root",
        type=Path,
        default=Path("."),
        help="Repository checkout containing the iOS source (default: current directory)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional JSON output path; otherwise print provenance to stdout",
    )
    parser.add_argument(
        "--expected-app-group",
        default=EXPECTED_APP_GROUP,
        help="Expected shared App Group identifier",
    )
    args = parser.parse_args()

    provenance = validate_source_entitlements(args.source_root, args.expected_app_group)
    encoded = json.dumps(provenance, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")


if __name__ == "__main__":
    main()
