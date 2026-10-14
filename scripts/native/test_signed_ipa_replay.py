"""Fabricated release responses; no credentials, signing or upload."""
from copy import deepcopy
import pathlib
import stat
import tempfile
import unittest
import signed_ipa_replay as replay
import apple_build_guard as apple


class ReplayTests(unittest.TestCase):
    def setUp(self):
        self.selected = {'run': '123', 'attempt': '1', 'source': 'a' * 40, 'sha256': 'b' * 64}
        self.run = {'id': 123, 'run_attempt': 1, 'head_sha': 'a' * 40,
                    'status': 'completed', 'conclusion': 'success', 'event': 'workflow_dispatch',
                    'head_branch': replay.RELEASE_BRANCH, 'path': '.github/workflows/ios-testflight.yml',
                    'repository': {'full_name': replay.REPOSITORY},
                    'actor': {'id': replay.OWNER_ID}, 'triggering_actor': {'id': replay.OWNER_ID}}
        self.jobs = {'jobs': [{'name': n, 'conclusion': c} for n, c in
                             [('preflight', 'success'), ('archive', 'success'), ('upload', 'skipped')]]}
        self.approvals = [{'state': 'approved', 'user': {'id': replay.OWNER_ID},
                           'environments': [{'name': 'ios-signing'}]}]
        self.artifact = {'id': 100, 'name': 'faithful-days-approved-ipa-123-1', 'expired': False,
                         'workflow_run': {'head_sha': 'a' * 40}}

    def test_exact_owner_candidate_accepted(self):
        replay.validate_run(self.run, self.jobs, self.approvals, self.selected)
        self.assertEqual(replay.choose_artifact({'artifacts': [self.artifact]}, self.selected), 100)

    def test_run_identity_and_outcome_changes_rejected(self):
        for key, value in [('id', 124), ('run_attempt', 2), ('head_sha', 'c' * 40),
                           ('conclusion', 'failure'), ('event', 'push'), ('status', 'in_progress'),
                           ('head_branch', 'main'), ('path', 'other.yml'),
                           ('repository', {'full_name': 'other/repo'}), ('actor', {'id': 1}),
                           ('triggering_actor', {'id': 1})]:
            run = dict(self.run, **{key: value})
            with self.subTest(key=key), self.assertRaises(ValueError):
                replay.validate_run(run, self.jobs, self.approvals, self.selected)

    def test_incomplete_jobs_and_uncertain_prior_upload_rejected(self):
        for index in range(3):
            jobs = deepcopy(self.jobs)
            jobs['jobs'][index]['conclusion'] = 'failure'
            with self.subTest(index=index), self.assertRaises(ValueError):
                replay.validate_run(self.run, jobs, self.approvals, self.selected)

    def test_duplicate_job_rejected(self):
        jobs = {'jobs': self.jobs['jobs'] + [self.jobs['jobs'][0]]}
        with self.assertRaises(ValueError):
            replay.validate_run(self.run, jobs, self.approvals, self.selected)

    def test_redirect_rejected(self):
        with self.assertRaises(ValueError):
            apple.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.example')

    def test_signing_approval_required(self):
        for approvals in [[], [dict(self.approvals[0], state='rejected')],
                          [dict(self.approvals[0], user={'id': 1})]]:
            with self.assertRaises(ValueError):
                replay.validate_run(self.run, self.jobs, approvals, self.selected)

    def test_expired_missing_duplicate_or_wrong_source_artifact_rejected(self):
        for artifacts in [[], [self.artifact, self.artifact], [dict(self.artifact, expired=True)],
                          [dict(self.artifact, workflow_run={'head_sha': 'c' * 40})]]:
            with self.assertRaises(ValueError):
                replay.choose_artifact({'artifacts': artifacts}, self.selected)

    def test_selection_rejects_shell_fragments_and_simulator_mode(self):
        env = {'REPLAY_' + k.upper(): v for k, v in self.selected.items()}
        self.assertEqual(replay.selection(env), self.selected)
        for key, value in [('REPLAY_RUN', '123;anything'), ('REPLAY_SOURCE', 'main'),
                           ('REPLAY_SHA256', 'bad'), ('REPLAY_ATTEMPT', '01'),
                           ('REPLAY_SKIP_UPLOAD', 'true')]:
            with self.assertRaises(ValueError):
                replay.selection(dict(env, **{key: value}))

    def test_apple_build_history_rejects_reuse_and_higher_numbers(self):
        apple.unused({'buildNumber': 531}, [{'attributes': {'version': '530'}}])
        for version in ['531', '532', 'unknown']:
            with self.assertRaises(ValueError):
                apple.unused({'buildNumber': 531}, [{'attributes': {'version': version}}])

    def test_apple_redirect_destination_rejected_before_authentication(self):
        with self.assertRaises(ValueError):
            apple.get('https://other.example/v1/builds')

    def test_apple_http_error_reports_status_code_and_title_only(self):
        error = apple._api_error(
            'https://api.appstoreconnect.apple.com/v1/apps/6821076241',
            403,
            {'errors': [{'code': 'FORBIDDEN_ERROR', 'title': 'Forbidden',
                         'detail': 'do not log this request detail'}]},
        )
        self.assertEqual(error.status, 403)
        self.assertEqual(error.code, 'FORBIDDEN_ERROR')
        self.assertIn('HTTP 403', str(error))
        self.assertIn('FORBIDDEN_ERROR', str(error))
        self.assertIn('Forbidden', str(error))
        self.assertNotIn('do not log this request detail', str(error))

    def test_apple_http_error_handles_non_json_body(self):
        error = apple._api_error(
            'https://api.appstoreconnect.apple.com/v1/builds', 401, {}
        )
        self.assertEqual(str(error), 'Apple API HTTP 401 at /v1/builds')

    def test_private_key_writer_uses_owner_only_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'private.p8'
            apple.write_private_key(path, 'fabricated-key')
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            self.assertEqual(path.read_text(), 'fabricated-key')


if __name__ == '__main__':
    unittest.main()
