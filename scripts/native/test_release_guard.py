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

    def test_environment_requires_actual_reviewer_rule_and_no_self_review(self):
        valid = {'type': 'required_reviewers', 'prevent_self_review': True, 'reviewers': [{'type': 'User', 'reviewer': {'id': 1}}]}
        guard.require_environment({'protection_rules': [valid]})
        for rules in ([], [dict(valid, prevent_self_review=False)], [dict(valid, reviewers=[])], [dict(valid, reviewers=[None])], [{'type': 'branch_policy'}]):
            with self.subTest(rules=rules), self.assertRaises(ValueError):
                guard.require_environment({'protection_rules': rules})

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
