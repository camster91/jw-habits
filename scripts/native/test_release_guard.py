"""Fabricated API responses; no GitHub calls or release execution."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('guard', Path(__file__).with_name('release_guard.py'))
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class ReleaseGuardTests(unittest.TestCase):
    def checks(self):
        return {'check_runs': [{'id': index + 1, 'name': name, 'app': {'id': 15368}, 'status': 'completed', 'conclusion': 'success'} for index, name in enumerate(guard.REQUIRED)]}

    def test_all_exact_checks_required(self):
        self.assertTrue(guard.source_state(self.checks()))
        self.assertFalse(guard.source_state({'check_runs': self.checks()['check_runs'][:-1]}))
        pending = self.checks()
        pending['check_runs'][0].update(status='in_progress', conclusion=None)
        self.assertFalse(guard.source_state(pending))

    def test_failure_skip_neutral_and_wrong_app_are_denied(self):
        for conclusion in ('failure', 'skipped', 'neutral', 'cancelled', None):
            payload = self.checks()
            payload['check_runs'][0]['conclusion'] = conclusion
            with self.subTest(conclusion=conclusion), self.assertRaises(ValueError):
                guard.source_state(payload)
        payload = self.checks()
        payload['check_runs'][0]['app']['id'] = 1
        with self.assertRaises(ValueError):
            guard.source_state(payload)

    def test_newest_attempt_controls_even_if_old_attempt_succeeded(self):
        payload = self.checks()
        payload['check_runs'].append(dict(payload['check_runs'][0], id=100, status='in_progress', conclusion=None))
        self.assertFalse(guard.source_state(payload))
        payload['check_runs'][-1].update(status='completed', conclusion='failure')
        with self.assertRaises(ValueError):
            guard.source_state(payload)

    def environment(self):
        return {'protection_rules': [{'type': 'required_reviewers', 'prevent_self_review': False,
                'reviewers': [{'type': 'User', 'reviewer': {'id': guard.OWNER_ID, 'login': guard.OWNER_LOGIN}}]}],
                'deployment_branch_policy': {'protected_branches': False, 'custom_branch_policies': True}}

    def context(self):
        return {'GITHUB_REPOSITORY': 'camster91/jw-habits', 'GITHUB_EVENT_NAME': 'workflow_dispatch',
                'GITHUB_ACTOR': guard.OWNER_LOGIN, 'GITHUB_ACTOR_ID': str(guard.OWNER_ID),
                'GITHUB_TRIGGERING_ACTOR': guard.OWNER_LOGIN, 'GITHUB_REF': 'refs/heads/' + guard.RELEASE_BRANCH}

    def test_owner_policy_is_explicit(self):
        guard.require_environment(self.environment())
        guard.require_owner_dispatch(self.context())
        guard.require_branch_policy({'total_count': 1, 'branch_policies': [{'name': guard.RELEASE_BRANCH, 'type': 'branch'}]})

    def test_missing_and_wrong_reviewers_are_denied(self):
        for reviewers in ([], [None], [{'type': 'Team', 'reviewer': {'id': guard.OWNER_ID, 'login': guard.OWNER_LOGIN}}],
                          [{'type': 'User', 'reviewer': {'id': 1, 'login': guard.OWNER_LOGIN}}],
                          [{'type': 'User', 'reviewer': {'id': guard.OWNER_ID, 'login': 'someone-else'}}]):
            payload = self.environment()
            payload['protection_rules'][0]['reviewers'] = reviewers
            with self.subTest(reviewers=reviewers), self.assertRaises(ValueError):
                guard.require_environment(payload)

    def test_extra_reviewers_and_duplicate_rules_are_denied(self):
        payload = self.environment()
        payload['protection_rules'][0]['reviewers'] *= 2
        with self.assertRaises(ValueError): guard.require_environment(payload)
        payload = self.environment()
        payload['protection_rules'] *= 2
        with self.assertRaises(ValueError): guard.require_environment(payload)

    def test_missing_and_incompatible_policy_are_denied(self):
        for field in ('prevent_self_review', 'reviewers'):
            payload = self.environment()
            del payload['protection_rules'][0][field]
            with self.subTest(field=field), self.assertRaises(ValueError): guard.require_environment(payload)
        payload = self.environment()
        payload['protection_rules'][0]['prevent_self_review'] = True
        with self.assertRaises(ValueError): guard.require_environment(payload)
        for policy in (None, {}, {'protected_branches': True, 'custom_branch_policies': False}):
            payload = self.environment()
            payload['deployment_branch_policy'] = policy
            with self.subTest(policy=policy), self.assertRaises(ValueError): guard.require_environment(payload)

    def test_unauthorized_dispatch_and_rerun_are_denied(self):
        for field in self.context():
            for value in ('unexpected', None):
                payload = self.context()
                payload[field] = value
                with self.subTest(field=field, value=value), self.assertRaises(ValueError): guard.require_owner_dispatch(payload)
        for event in ('push', 'pull_request', 'workflow_run'):
            payload = self.context()
            payload['GITHUB_EVENT_NAME'] = event
            with self.subTest(event=event), self.assertRaises(ValueError): guard.require_owner_dispatch(payload)

    def test_unrestricted_wildcard_tag_and_other_branch_are_denied(self):
        for payload in (None, {}, {'total_count': 0, 'branch_policies': []},
                        {'total_count': 2, 'branch_policies': [{'name': guard.RELEASE_BRANCH, 'type': 'branch'}]},
                        {'total_count': 1, 'branch_policies': [{'name': '*', 'type': 'branch'}]},
                        {'total_count': 1, 'branch_policies': [{'name': guard.RELEASE_BRANCH, 'type': 'tag'}]},
                        {'total_count': 1, 'branch_policies': [{'name': 'main', 'type': 'branch'}]}):
            with self.subTest(payload=payload), self.assertRaises(ValueError): guard.require_branch_policy(payload)

    def test_malformed_responses_fail_closed(self):
        for payload in (None, {}, {'check_runs': {}}, {'check_runs': [None]}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                guard.source_state(payload)
        for payload in (None, {}, {'protection_rules': {}}):
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                guard.require_environment(payload)

    def test_wait_rechecks_same_source_until_current_checks_succeed(self):
        with patch.object(guard, 'api', side_effect=[{'check_runs': []}, self.checks()]) as api, patch.object(guard.time, 'sleep'):
            guard.wait_source('camster91/jw-habits', 'a' * 40)
            self.assertEqual(api.call_count, 2)
            self.assertEqual(api.call_args_list[0], api.call_args_list[1])

    def test_invalid_source_and_timeout_do_not_bypass_checks(self):
        with patch.object(guard, 'api') as api, self.assertRaises(ValueError):
            guard.wait_source('camster91/jw-habits', 'invalid')
        api.assert_not_called()
        with patch.object(guard, 'api', return_value={'check_runs': []}), self.assertRaises(ValueError):
            guard.wait_source('camster91/jw-habits', 'a' * 40, timeout=0)


if __name__ == '__main__':
    unittest.main()
