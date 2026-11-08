#!/usr/bin/env python3
"""Focused negative tests for iOS unsigned provenance validation."""

from __future__ import annotations

import plistlib
import tempfile
import unittest
from pathlib import Path

from ios_unsigned_provenance import (
    EXPECTED_APP_GROUP,
    ValidationError,
    validate_source_entitlements,
)


def _write_fixture(root: Path, app_group: str = EXPECTED_APP_GROUP) -> None:
    for _, relative_path in (
        ("app", "ios/App/App/App.entitlements"),
        ("widget", "ios/App/FaithfulDaysWidget/FaithfulDaysWidget.entitlements"),
    ):
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(
            plistlib.dumps(
                {"com.apple.security.application-groups": [app_group]},
                fmt=plistlib.FMT_XML,
            )
        )


class IOSUnsignedProvenanceTests(unittest.TestCase):
    def test_rejects_unexpected_app_group(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            _write_fixture(root, "group.example.invalid")
            with self.assertRaisesRegex(ValidationError, "Unexpected app App Groups"):
                validate_source_entitlements(root)

    def test_rejects_missing_widget_entitlement(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            _write_fixture(root)
            (root / "ios/App/FaithfulDaysWidget/FaithfulDaysWidget.entitlements").unlink()
            with self.assertRaisesRegex(ValidationError, "Missing widget entitlement"):
                validate_source_entitlements(root)


if __name__ == "__main__":
    unittest.main()
