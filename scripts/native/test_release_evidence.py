"""Synthetic archives and metadata; no native build, signing or upload."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import plistlib
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location('release_evidence', Path(__file__).with_name('release_evidence.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
SHA = 'a' * 40
CERT_BYTES = b'fabricated signer DER, not a certificate or key'
CERT_SHA = hashlib.sha256(CERT_BYTES).hexdigest()
CERT_OUTPUT = 'Signer #1:\n\nCertificate #1:\nCertificate owner: CN=Fabricated\n-----BEGIN CERTIFICATE-----\n' + base64.b64encode(CERT_BYTES).decode() + '\n-----END CERTIFICATE-----\n'


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

    def test_android_sdk_badging_codename_does_not_replace_package_name(self):
        line = "package: name='ca.ashbi.habittracker' versionCode='520' versionName='5.2.0' platformBuildVersionName='16' platformBuildVersionCode='36' compileSdkVersion='36' compileSdkVersionCodename='16'"
        self.assertEqual(release.inspect_android(line, self.metadata)[0]['identifier'], release.APP_ID)

    def test_android_prefixed_attribute_cannot_supply_a_missing_required_field(self):
        for line in ("package: compileSdkVersionCodename='ca.ashbi.habittracker' versionCode='520' versionName='5.2.0'",
                     "package: name='ca.ashbi.habittracker' injectedversionCode='520' versionName='5.2.0'",
                     "package: name='ca.ashbi.habittracker' versionCode='520' injectedversionName='5.2.0'"):
            with self.subTest(line=line), self.assertRaises(ValueError):
                release.inspect_android(line, self.metadata)

    def test_android_duplicate_or_malformed_package_fields_are_rejected(self):
        valid = "package: name='ca.ashbi.habittracker' versionCode='520' versionName='5.2.0'"
        for line in (valid + " name='ca.ashbi.habittracker'", valid + " versionCode='520'",
                     valid + ' trailing-garbage', valid.replace("name='", "name=\"", 1)):
            with self.subTest(line=line), self.assertRaises(ValueError):
                release.inspect_android(line, self.metadata)

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
            release.verify_aab(self.signed_fixture(), tool, CERT_SHA)
        self.process.assert_not_called()

    def test_unsigned_aab_refuses_verifier_execution(self):
        with patch.object(release, 'digest', return_value=release.BUNDLETOOL_SHA256):
            self.process.reset_mock()
            with self.assertRaises(ValueError):
                release.verify_aab(self.ipa(), self.root / 'fake-tool.jar', CERT_SHA)
            self.process.assert_not_called()

    def test_failed_or_partial_signature_stops_bundle_validation(self):
        for output in ('jar is unsigned.', 'jar verified.\nThis jar contains unsigned entries.'):
            with self.subTest(output=output), patch.object(release, 'digest', return_value=release.BUNDLETOOL_SHA256), patch.object(release.subprocess, 'check_output', return_value=output) as process:
                with self.assertRaises(ValueError):
                    release.verify_aab(self.signed_fixture(), self.root / 'fake-tool.jar', CERT_SHA)
                self.assertEqual(process.call_count, 1)

    def test_verified_signature_and_bundle_structure_yield_actual_manifest(self):
        with patch.object(release, 'digest', return_value=release.BUNDLETOOL_SHA256), patch.object(release.subprocess, 'check_output', side_effect=['jar verified.', CERT_OUTPUT, b'Bundle valid', self.manifest()]) as process:
            manifest = release.verify_aab(self.signed_fixture(), self.root / 'fake-tool.jar', CERT_SHA)
            self.assertEqual(release.inspect_aab_manifest(manifest, self.metadata)[0]['version'], '5.2.0')
            self.assertEqual(process.call_count, 4)

    def test_expected_certificate_missing_or_malformed_refuses_all_execution(self):
        for fingerprint in ('', 'a' * 63, 'aa:' * 32, 'a' * 64 + '\nINJECT=1', None):
            with self.subTest(fingerprint=fingerprint), self.assertRaises(ValueError):
                release.verify_aab(self.signed_fixture(), self.root / 'fake-tool.jar', fingerprint)
        self.process.reset_mock()
        with self.assertRaises(ValueError):
            release.verify_aab(self.signed_fixture(), self.root / 'fake-tool.jar')
        self.process.assert_not_called()

    def test_certificate_accepts_colon_separated_uppercase_fingerprint(self):
        formatted = ':'.join(CERT_SHA[i:i+2].upper() for i in range(0, 64, 2))
        self.assertEqual(release.verify_upload_certificate(CERT_OUTPUT, formatted), CERT_SHA)

    def test_certificate_rejects_wrong_leaf_even_when_chain_or_timestamp_matches(self):
        other = base64.b64encode(b'other fabricated DER').decode()
        wrong_leaf = CERT_OUTPUT.replace(base64.b64encode(CERT_BYTES).decode(), other)
        with self.assertRaises(ValueError):
            release.verify_upload_certificate(wrong_leaf, CERT_SHA)
        for suffix in ('\nCertificate #2:\n', '\nTimestamp:\nCertificate #1:\n'):
            with self.subTest(suffix=suffix), self.assertRaises(ValueError):
                release.verify_upload_certificate(wrong_leaf + suffix + CERT_OUTPUT.split('Certificate #1:')[1], CERT_SHA)

    def test_matching_leaf_remains_valid_with_a_chain_or_timestamp_certificate(self):
        for suffix in ('\nCertificate #2:\n', '\nTimestamp:\nCertificate #1:\n'):
            self.assertEqual(release.verify_upload_certificate(CERT_OUTPUT + suffix + CERT_OUTPUT.split('Certificate #1:')[1], CERT_SHA), CERT_SHA)

    def test_certificate_rejects_missing_multiple_or_ambiguous_signers(self):
        cases = ('Not a signed jar file', CERT_OUTPUT + CERT_OUTPUT.replace('Signer #1:', 'Signer #2:'),
                 CERT_OUTPUT.replace('Signer #1:', 'Signer #2:'), CERT_OUTPUT.replace('Certificate #1:', 'Certificate #2:'),
                 CERT_OUTPUT + CERT_OUTPUT.split('Certificate #1:')[1])
        for output in cases:
            with self.subTest(output=output), self.assertRaises(ValueError):
                release.verify_upload_certificate(output, CERT_SHA)

    def test_wrong_signer_blocks_bundletool_before_structure_or_manifest_inspection(self):
        with patch.object(release, 'digest', return_value=release.BUNDLETOOL_SHA256), patch.object(release.subprocess, 'check_output', side_effect=['jar verified.', CERT_OUTPUT]) as process:
            with self.assertRaises(ValueError):
                release.verify_aab(self.signed_fixture(), self.root / 'fake-tool.jar', 'b' * 64)
            self.assertEqual(process.call_count, 2)
            self.assertEqual(process.call_args_list[1].args[0][0], 'keytool')

    def test_cli_binds_verified_upload_certificate_to_replay_evidence(self):
        metadata = self.root / 'version.json'
        metadata.write_text(json.dumps(self.metadata))
        output = self.root / 'artifact.json'
        path = self.signed_fixture()
        formatted = ':'.join(CERT_SHA[i:i+2].upper() for i in range(0, 64, 2))
        args = ['release_evidence.py', 'record', '--metadata', str(metadata), '--artifact', str(path),
                '--platform', 'android-aab', '--bundletool', str(self.root / 'fake-tool.jar'),
                '--expected-upload-cert-sha256', formatted, '--output', str(output)]
        with patch.object(sys, 'argv', args), patch.object(release, 'resolve', return_value=self.metadata), patch.object(release, 'verify_aab', return_value=self.manifest()) as verifier:
            release.main()
        verifier.assert_called_once_with(path, self.root / 'fake-tool.jar', formatted)
        evidence = json.loads(output.read_text())
        self.assertEqual(evidence['uploadCertificateSha256'], CERT_SHA)
        self.assertEqual(evidence['signingVerification'], 'jar-signature-and-configured-upload-certificate-verified')
        self.assertEqual(evidence['storeProcessing'], 'not-verified')
        self.assertEqual(evidence['deviceInstallation'], 'not-verified')


if __name__ == '__main__':
    unittest.main()
