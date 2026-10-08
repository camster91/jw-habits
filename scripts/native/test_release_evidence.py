"""Synthetic archives and metadata; no native build, signing or upload."""
import importlib.util
import json
from pathlib import Path
import plistlib
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('release_evidence', Path(__file__).with_name('release_evidence.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
SHA = 'a' * 40


class ReleaseEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'package.json').write_text(json.dumps({'version': '5.2.0'}))
        (self.root / 'native-release.json').write_text(json.dumps({'buildNumber': 520}))
        (self.root / 'package-lock.json').write_text('{}')
        self.git = patch.object(release.subprocess, 'check_output', return_value=SHA + '\n')
        self.process = self.git.start()
        self.addCleanup(self.git.stop)
        self.metadata = release.resolve(self.root)

    def test_canonical_version_build_and_source_hash(self):
        self.assertEqual(self.metadata['version'], '5.2.0')
        self.assertEqual(self.metadata['buildNumber'], 520)
        self.assertEqual(self.metadata['sourceCommit'], SHA)
        self.assertEqual(len(self.metadata['packageLockSha256']), 64)
        self.assertEqual(release.resolve(self.root, build='521', ref='refs/tags/v5.2.0', expected_sha=SHA)['buildNumber'], 521)

    def test_rejects_tag_override_and_source_mismatch(self):
        for kwargs in ({'ref': 'refs/tags/v5.1.0'}, {'ref': 'refs/tags/v5.2.0-beta'},
                       {'version': '5.3.0'}, {'version': '5.2.0\nUNTRUSTED=1'}, {'expected_sha': 'b' * 40}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                release.resolve(self.root, **kwargs)

    def test_build_limits_and_regressions(self):
        for value in ('0', '-1', '0510', '519', '1.2', '520\nINJECT=1', '2100000001'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                release.resolve(self.root, build=value)
        self.assertEqual(release.build_number('2100000000'), 2100000000)
        with self.assertRaises(ValueError):
            release.build_number(True)

    def test_package_version_must_be_canonical(self):
        for version in ('5.2', '05.2.0', '5.2.0-beta', '5.2.0+build', None):
            (self.root / 'package.json').write_text(json.dumps({'version': version}))
            with self.subTest(version=version), self.assertRaises(ValueError):
                release.resolve(self.root)

    def plist(self, identifier, build='520', version='5.2.0'):
        return {'CFBundleIdentifier': identifier, 'CFBundleShortVersionString': version, 'CFBundleVersion': build}

    def ipa(self, app=None, widget=None, omit_widget=False):
        path = self.root / 'synthetic.ipa'
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr('Payload/App.app/Info.plist', plistlib.dumps(app or self.plist(release.APP_ID), fmt=plistlib.FMT_BINARY))
            if not omit_widget:
                archive.writestr('Payload/App.app/PlugIns/Widget.appex/Info.plist', plistlib.dumps(widget or self.plist(release.WIDGET_ID)))
        return path

    def test_ipa_checks_actual_app_and_widget_metadata(self):
        path = self.ipa()
        evidence = release.record(path, self.metadata, 'ios')
        self.assertEqual(len(evidence['bundles']), 2)
        self.assertEqual(evidence['artifact']['sha256'], release.digest(path))
        self.assertEqual(evidence['artifact']['bytes'], path.stat().st_size)
        self.assertEqual(evidence['signingVerification'], 'not-performed')
        self.assertEqual(evidence['storeProcessing'], 'not-verified')
        self.assertEqual(evidence['deviceInstallation'], 'not-verified')
        self.assertNotIn(str(self.root), json.dumps(evidence))

    def test_ipa_missing_widget_wrong_identity_or_stale_build_fails(self):
        cases = ({'omit_widget': True}, {'app': self.plist('other.app')},
                 {'widget': self.plist(release.WIDGET_ID, build='519')},
                 {'app': self.plist(release.APP_ID, version='5.1.0')})
        for kwargs in cases:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                release.record(self.ipa(**kwargs), self.metadata, 'ios')

    def test_ipa_rejects_unexpected_extension_and_ambiguous_paths(self):
        path = self.ipa()
        with zipfile.ZipFile(path, 'a') as archive:
            archive.writestr('Payload/App.app/PlugIns/Other.appex/Info.plist', plistlib.dumps(self.plist('other.app')))
        with self.assertRaises(ValueError):
            release.record(path, self.metadata, 'ios')
        path = self.ipa()
        with zipfile.ZipFile(path, 'a') as archive:
            archive.writestr('../untrusted', 'not extracted')
        with self.assertRaises(ValueError):
            release.record(path, self.metadata, 'ios')

    def test_android_package_metadata_must_match(self):
        valid = "package: name='ca.ashbi.habittracker' versionCode='520' versionName='5.2.0' platformBuildVersionName='36'"
        self.assertEqual(release.inspect_android(valid, self.metadata)[0]['identifier'], release.APP_ID)
        for text in ('', valid + '\n' + valid, valid.replace('520', '519'), valid.replace('5.2.0', '5.1.0'), valid.replace(release.APP_ID, 'other.app')):
            with self.subTest(text=text), self.assertRaises(ValueError):
                release.inspect_android(text, self.metadata)

    def test_invalid_metadata_and_empty_artifact_fail(self):
        path = self.root / 'empty.ipa'
        path.touch()
        with self.assertRaises(ValueError):
            release.record(path, self.metadata, 'ios')
        for change in ({'schemaVersion': 2}, {'sourceCommit': 'untrusted'}, {'buildNumber': 0}, {'packageLockSha256': ''}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                release.record(self.ipa(), dict(self.metadata, **change), 'ios')

    def test_xcode_defaults_detect_drift_without_changing_source(self):
        path = self.root / 'ios/App/App.xcodeproj/project.pbxproj'
        path.parent.mkdir(parents=True)
        canonical = 'MARKETING_VERSION = 5.2.0; CURRENT_PROJECT_VERSION = 520;\n' * 4
        path.write_text(canonical)
        release.check_xcode_defaults(self.metadata, self.root)
        path.write_text(canonical.replace('520', '519', 1))
        with self.assertRaises(ValueError):
            release.check_xcode_defaults(self.metadata, self.root)

    def manifest(self, package=release.APP_ID, build='520', version='5.2.0'):
        return '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="' + package + '" android:versionCode="' + build + '" android:versionName="' + version + '" />'

    def test_aab_manifest_mismatch_blocks_evidence(self):
        self.assertEqual(release.inspect_aab_manifest(self.manifest(), self.metadata)[0]['identifier'], release.APP_ID)
        for xml in (self.manifest(package='other.app'), self.manifest(build='519'), self.manifest(version='5.1.0'), '<manifest />'):
            with self.subTest(xml=xml), self.assertRaises(ValueError):
                release.inspect_aab_manifest(xml, self.metadata)

    def signed_fixture(self):
        path = self.root / 'synthetic.aab'
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr('META-INF/UPLOAD.SF', 'fabricated, not a signature')
            archive.writestr('META-INF/UPLOAD.RSA', 'fabricated, not a key')
        return path

    def test_bundletool_checksum_mismatch_refuses_execution(self):
        tool = self.root / 'fake-tool.jar'
        tool.write_text('not executable')
        self.process.reset_mock()
        with self.assertRaises(ValueError):
            release.verify_aab(self.signed_fixture(), tool)
        self.process.assert_not_called()

    def test_unsigned_aab_refuses_verifier_execution(self):
        with patch.object(release, 'digest', return_value=release.BUNDLETOOL_SHA256):
            self.process.reset_mock()
            with self.assertRaises(ValueError):
                release.verify_aab(self.ipa(), self.root / 'fake-tool.jar')
            self.process.assert_not_called()

    def test_failed_or_partial_signature_stops_bundle_validation(self):
        for output in ('jar is unsigned.', 'jar verified.\nThis jar contains unsigned entries.'):
            with self.subTest(output=output), patch.object(release, 'digest', return_value=release.BUNDLETOOL_SHA256), patch.object(release.subprocess, 'check_output', return_value=output) as process:
                with self.assertRaises(ValueError):
                    release.verify_aab(self.signed_fixture(), self.root / 'fake-tool.jar')
                self.assertEqual(process.call_count, 1)

    def test_verified_signature_and_bundle_structure_yield_actual_manifest(self):
        with patch.object(release, 'digest', return_value=release.BUNDLETOOL_SHA256), patch.object(release.subprocess, 'check_output', side_effect=['jar verified.', b'Bundle valid', self.manifest()]) as process:
            manifest = release.verify_aab(self.signed_fixture(), self.root / 'fake-tool.jar')
            self.assertEqual(release.inspect_aab_manifest(manifest, self.metadata)[0]['version'], '5.2.0')
            self.assertEqual(process.call_count, 3)


if __name__ == '__main__':
    unittest.main()
