"""Failure-path checks with isolated fake Docker/HTTP; never touch a VPS."""
import json
import os
from pathlib import Path
import subprocess
import shutil
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent
REVISION = 'a' * 40
IMAGE = 'ghcr.io/camster91/jw-habits@sha256:' + 'b' * 64
FAKE = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
p = pathlib.Path(os.environ['FAKE_STATE'])
s = json.loads(p.read_text())
args = sys.argv[1:]
cmd = pathlib.Path(sys.argv[0]).name
s['calls'].append([cmd] + args)
rc = 0
if cmd == 'docker':
    op = args[0]
    if op == 'inspect':
        name = args[-1]
        if name not in s['containers']: rc = 1
        elif '--format' in args: print(s['containers'][name]['image'])
    elif op == 'rm': s['containers'].pop(args[-1], None)
    elif op == 'run':
        name = args[args.index('--name') + 1]
        if name == 'jw-habits' and os.environ.get('FAIL_START'): rc = 1
        else: s['containers'][name] = {'image': os.environ['IMAGE'], 'running': True}
    elif op == 'port': print('127.0.0.1:18081')
    elif op == 'rename': s['containers'][args[2]] = s['containers'].pop(args[1])
    elif op in ('stop', 'start'): s['containers'][args[1]]['running'] = op == 'start'
    elif op == 'compose': s['containers']['jw-habits'] = {'image': os.environ['IMAGE'], 'running': True}
    elif op == 'login': sys.stdin.read()
    elif op == 'pull' and os.environ.get('HANG_PULL'):
        import time
        time.sleep(10)
elif cmd == 'curl':
    url = args[-1]
    stage = ':18081' in url
    public = url.startswith('https:')
    current = s['containers'].get('jw-habits', {}).get('image', '')
    bad = (stage and os.environ.get('FAIL_STAGE')) or (public and os.environ.get('FAIL_PUBLIC') and current == os.environ['IMAGE'])
    if bad: rc = 22
    elif '/release.json' in url: print(json.dumps({'revision': os.environ['REVISION']}))
    elif '/manifest.webmanifest' in url: print(json.dumps({'name': 'Faithful Days'}))
    elif '/sw.js' in url: print('precache')
    else: print('<title>Faithful Days</title>')
p.write_text(json.dumps(s))
sys.exit(rc)
'''


class DeployRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if shutil.which('timeout') is None:
            raise RuntimeError('Deployment simulations require GNU timeout on PATH; missing tooling is not rollback evidence')

    def run_case(self, **flags):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            bin_dir = root / 'bin'
            bin_dir.mkdir()
            for name in ('docker', 'curl'):
                exe = bin_dir / name
                exe.write_text(FAKE)
                exe.chmod(0o755)
            sleep = bin_dir / 'sleep'
            sleep.write_text('#!/bin/sh\nexit 0\n')
            sleep.chmod(0o755)
            state = root / 'state.json'
            state.write_text(json.dumps({'containers': {'jw-habits': {'image': 'old-digest', 'running': True}}, 'calls': []}))
            project = root / 'project'
            project.mkdir()
            (project / 'docker-compose.yml').write_text('old compose\n')
            env = dict(os.environ, PATH=f'{bin_dir}:{os.environ["PATH"]}', FAKE_STATE=str(state), PROJECT_DIR=str(project), PROJECT_NAME='jw-habits', PORT='18080', IMAGE=IMAGE, REVISION=REVISION, PUBLIC_URL='https://jwhabits.ashbi.ca', GHCR_USER='test', **flags)
            result = subprocess.run(['bash', str(ROOT / 'remote.sh')], input='fake-token\n', text=True, capture_output=True, env=env)
            return result, json.loads(state.read_text()), (project / 'docker-compose.yml').read_text()

    def test_bad_staged_image_never_stops_production(self):
        result, state, compose = self.run_case(FAIL_STAGE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Staged revision failed', result.stdout)
        self.assertTrue(any(call[:2] == ['docker', 'run'] for call in state['calls']))
        self.assertEqual(state['containers']['jw-habits']['image'], 'old-digest')
        self.assertTrue(state['containers']['jw-habits']['running'])
        self.assertFalse(any(call[:2] == ['docker', 'stop'] for call in state['calls']))
        self.assertEqual(compose, 'old compose\n')

    def test_image_pull_deadline_leaves_production_serving(self):
        result, state, compose = self.run_case(HANG_PULL='1', PULL_TIMEOUT_SECONDS='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('production was not touched', result.stdout)
        self.assertIn('Image pull failed or exceeded its deadline', result.stdout)
        self.assertNotIn('timeout: command not found', result.stderr)
        self.assertTrue(state['containers']['jw-habits']['running'])
        self.assertEqual(state['containers']['jw-habits']['image'], 'old-digest')
        self.assertFalse(any(call[:2] == ['docker', 'stop'] for call in state['calls']))
        self.assertEqual(compose, 'old compose\n')

    def test_invalid_image_pull_deadline_is_refused(self):
        result, state, compose = self.run_case(PULL_TIMEOUT_SECONDS='0')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Invalid image pull deadline', result.stdout)
        self.assertTrue(state['containers']['jw-habits']['running'])
        self.assertEqual(compose, 'old compose\n')

    def test_failed_public_validation_restores_previous_container(self):
        result, state, compose = self.run_case(FAIL_PUBLIC='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Local/public revision or TLS check failed', result.stdout)
        self.assertIn(['docker', 'rename', 'jw-habits-previous', 'jw-habits'], state['calls'])
        self.assertEqual(state['containers']['jw-habits']['image'], 'old-digest')
        self.assertTrue(state['containers']['jw-habits']['running'])
        self.assertEqual(compose, 'old compose\n')
        self.assertNotIn('jw-habits-candidate', state['containers'])

    def test_failed_start_restores_previous_container(self):
        result, state, compose = self.run_case(FAIL_START='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(['docker', 'rename', 'jw-habits-previous', 'jw-habits'], state['calls'])
        self.assertTrue(any(call[:2] == ['docker', 'run'] and '--name' in call and call[call.index('--name') + 1] == 'jw-habits' for call in state['calls']))
        self.assertEqual(state['containers']['jw-habits']['image'], 'old-digest')
        self.assertTrue(state['containers']['jw-habits']['running'])
        self.assertEqual(compose, 'old compose\n')

    def test_success_keeps_previous_image_for_manual_rollback(self):
        result, state, compose = self.run_case()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(state['containers']['jw-habits']['image'], IMAGE)
        self.assertEqual(state['containers']['jw-habits-previous']['image'], 'old-digest')
        self.assertFalse(state['containers']['jw-habits-previous']['running'])
        self.assertIn(IMAGE, compose)
        self.assertNotIn('jw-habits-candidate', state['containers'])


if __name__ == '__main__':
    unittest.main()
