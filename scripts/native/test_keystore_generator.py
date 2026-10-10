"""Exercise the signing helper with fabricated keytool; never create real keys."""
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'generate-android-keystore.sh'
REPO = SCRIPT.parent.parent
FAKE_PASSWORD = 'fabricated-test-only-store-password'
FAKE_KEY_PASSWORD = 'fabricated-test-only-key-password'


class KeystoreGeneratorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        tool = self.bin / 'keytool'
        tool.write_text('''#!/usr/bin/env python3
import json, os, pathlib, sys
args = sys.argv[1:]
output = pathlib.Path(args[args.index('-keystore') + 1])
report = {'args': args, 'stage_mode': output.parent.stat().st_mode & 0o777,
          'password_present': bool(os.environ.get('KEYSTORE_PASSWORD')),
          'key_matches_store': os.environ.get('KEY_PASSWORD') == os.environ.get('KEYSTORE_PASSWORD')}
pathlib.Path(os.environ['FAKE_REPORT']).write_text(json.dumps(report))
mode = os.environ.get('FAKE_MODE', 'success')
if mode == 'race':
    pathlib.Path(os.environ['FAKE_DESTINATION']).write_text('preserved competing file')
if mode == 'race-directory':
    pathlib.Path(os.environ['FAKE_DESTINATION']).mkdir()
if mode == 'race-symlink':
    pathlib.Path(os.environ['FAKE_DESTINATION']).symlink_to(output.parent, target_is_directory=True)
if mode == 'symlink':
    output.symlink_to(os.environ['FAKE_REPORT'])
elif mode != 'empty':
    output.write_text('fabricated keystore fixture; contains no key')
if mode == 'failure':
    print(os.environ['KEYSTORE_PASSWORD'])
    print(os.environ['KEY_PASSWORD'], file=sys.stderr)
    sys.exit(1)
''')
        tool.chmod(0o700)
        self.dest = self.root / 'private upload.jks'
        self.report = self.root / 'report.json'
        self.env = os.environ.copy()
        # Do not inherit real credentials, tracing hooks or Java configuration.
        for name in ('KEYSTORE_PASSWORD', 'KEY_PASSWORD', 'BASH_ENV', 'ENV', 'SHELLOPTS', 'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS'):
            self.env.pop(name, None)
        self.env.update(PATH=str(self.bin) + os.pathsep + self.env['PATH'],
                        KEYSTORE_PASSWORD=FAKE_PASSWORD, KEY_PASSWORD=FAKE_KEY_PASSWORD,
                        FAKE_REPORT=str(self.report), FAKE_DESTINATION=str(self.dest))

    def run_script(self, *args, mode='success'):
        result = subprocess.run(['bash', str(SCRIPT), *args], env=dict(self.env, FAKE_MODE=mode),
                                stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=10)
        self.assertNotIn(FAKE_PASSWORD, result.stdout + result.stderr)
        self.assertNotIn(FAKE_KEY_PASSWORD, result.stdout + result.stderr)
        self.assertEqual(list(self.root.glob('.faithful-days-key.*')), [])
        return result

    def test_creates_private_file_without_password_arguments(self):
        self.assertEqual(self.run_script(str(self.dest)).returncode, 0)
        report = json.loads(self.report.read_text())
        self.assertNotIn(FAKE_PASSWORD, report['args'])
        self.assertNotIn(FAKE_KEY_PASSWORD, report['args'])
        self.assertEqual(report['args'][report['args'].index('-storepass:env') + 1], 'KEYSTORE_PASSWORD')
        self.assertEqual(report['args'][report['args'].index('-keypass:env') + 1], 'KEY_PASSWORD')
        self.assertEqual(report['stage_mode'], 0o700)
        self.assertTrue(report['password_present'])
        self.assertFalse(report['key_matches_store'])
        self.assertEqual(stat.S_IMODE(self.dest.stat().st_mode), 0o600)
        self.assertIn('CN=Faithful Days', ' '.join(report['args']))

    def test_key_password_can_default_to_store_password(self):
        self.env.pop('KEY_PASSWORD')
        self.assertEqual(self.run_script(str(self.dest)).returncode, 0)
        self.assertTrue(json.loads(self.report.read_text())['key_matches_store'])

    def test_rejects_existing_file_and_dangling_symlink_before_tool_runs(self):
        self.dest.write_text('valuable existing file')
        self.assertNotEqual(self.run_script(str(self.dest)).returncode, 0)
        self.assertEqual(self.dest.read_text(), 'valuable existing file')
        self.dest.unlink()
        self.dest.symlink_to(self.root / 'missing')
        self.assertNotEqual(self.run_script(str(self.dest)).returncode, 0)
        self.assertTrue(self.dest.is_symlink())
        self.assertFalse(self.report.exists())

    def test_no_overwrite_if_file_appears_during_generation(self):
        self.assertNotEqual(self.run_script(str(self.dest), mode='race').returncode, 0)
        self.assertEqual(self.dest.read_text(), 'preserved competing file')

    def test_racing_directory_or_symlink_cannot_redirect_output(self):
        self.assertNotEqual(self.run_script(str(self.dest), mode='race-directory').returncode, 0)
        self.assertEqual(list(self.dest.iterdir()), [])
        self.dest.rmdir()
        self.assertNotEqual(self.run_script(str(self.dest), mode='race-symlink').returncode, 0)
        self.assertTrue(self.dest.is_symlink())

    def test_failures_remove_partial_output_and_hide_tool_diagnostics(self):
        for mode in ('failure', 'empty', 'symlink'):
            with self.subTest(mode=mode):
                self.assertNotEqual(self.run_script(str(self.dest), mode=mode).returncode, 0)
                self.assertFalse(self.dest.exists())
                self.assertFalse(self.dest.is_symlink())

    def test_rejects_repository_path_and_symlink_parent(self):
        self.assertNotEqual(self.run_script(str(REPO / 'unused-fixture.jks')).returncode, 0)
        link = self.root / 'checkout-link'
        link.symlink_to(REPO, target_is_directory=True)
        self.assertNotEqual(self.run_script(str(link / 'unused-fixture.jks')).returncode, 0)
        self.assertFalse(self.report.exists())

    def test_rejects_missing_relative_or_missing_parent_destination(self):
        for args in ((), ('relative.jks',), (str(self.root / 'missing' / 'upload.jks'),)):
            with self.subTest(args=args):
                self.assertNotEqual(self.run_script(*args).returncode, 0)
        self.assertFalse(self.report.exists())

    def test_no_noninteractive_password_or_short_password(self):
        self.env.pop('KEYSTORE_PASSWORD')
        self.env.pop('KEY_PASSWORD')
        self.assertNotEqual(self.run_script(str(self.dest)).returncode, 0)
        self.env['KEYSTORE_PASSWORD'] = 'short'
        self.assertNotEqual(self.run_script(str(self.dest)).returncode, 0)
        self.assertFalse(self.report.exists())

    def test_help_never_invokes_keytool(self):
        self.assertEqual(self.run_script('--help').returncode, 0)
        self.assertFalse(self.report.exists())


if __name__ == '__main__':
    unittest.main()
