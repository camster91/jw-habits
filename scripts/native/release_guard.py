"""Read-only exact-source and environment guards for native release workflows."""
import argparse
import json
import os
import re
import subprocess
import sys
import time

REQUIRED = ('Build + Lint + Test', 'Playwright smoke', 'Browser compatibility (firefox)',
            'Browser compatibility (webkit)', 'Android debug compile', 'iOS simulator compile')
ENVIRONMENTS = ('android-signing', 'play-closed-testing', 'ios-signing', 'testflight-upload')


def source_state(payload):
    latest = {}
    checks = payload.get('check_runs') if isinstance(payload, dict) else None
    if not isinstance(checks, list):
        raise ValueError('Invalid check response')
    for check in checks:
        if not isinstance(check, dict) or not isinstance(check.get('id'), int):
            raise ValueError('Invalid check record')
        name = check.get('name')
        if not isinstance(name, str):
            raise ValueError('Invalid check name')
        if name in REQUIRED and check['id'] > latest.get(name, {}).get('id', -1):
            latest[name] = check
    for name in REQUIRED:
        check = latest.get(name)
        if not check:
            continue
        if not isinstance(check.get('app'), dict) or check['app'].get('id') != 15368:
            raise ValueError('Required check came from an unexpected app')
        if check.get('status') == 'completed' and check.get('conclusion') != 'success':
            raise ValueError('Required source check did not succeed')
    return all(name in latest and latest[name].get('status') == 'completed' and latest[name].get('conclusion') == 'success' for name in REQUIRED)


OWNER_LOGIN = 'camster91'
OWNER_ID = 33962910
RELEASE_BRANCH = 'agent/261-launch-candidate-review'


def require_owner_dispatch(context):
    if not isinstance(context, dict) or any(context.get(key) != value for key, value in {
        'GITHUB_REPOSITORY': 'camster91/jw-habits',
        'GITHUB_EVENT_NAME': 'workflow_dispatch',
        'GITHUB_ACTOR': OWNER_LOGIN,
        'GITHUB_ACTOR_ID': str(OWNER_ID),
        'GITHUB_TRIGGERING_ACTOR': OWNER_LOGIN,
        'GITHUB_REF': 'refs/heads/' + RELEASE_BRANCH,
    }.items()):
        raise ValueError('Only the approved owner manual release branch is allowed')


def require_environment(payload):
    rules = payload.get('protection_rules') if isinstance(payload, dict) else None
    if not isinstance(rules, list):
        raise ValueError('Invalid environment response')
    reviewer_rules = [rule for rule in rules if isinstance(rule, dict) and rule.get('type') == 'required_reviewers']
    if len(reviewer_rules) != 1:
        raise ValueError('Exactly one owner review rule is required')
    rule = reviewer_rules[0]
    if rule.get('prevent_self_review') is not False:
        raise ValueError('Solo-owner policy must explicitly allow owner review')
    reviewers = rule.get('reviewers')
    if not isinstance(reviewers, list) or len(reviewers) != 1:
        raise ValueError('Only the approved owner may review')
    actor = reviewers[0]
    if not isinstance(actor, dict) or actor.get('type') != 'User':
        raise ValueError('Owner user reviewer is required')
    reviewer = actor.get('reviewer')
    if not isinstance(reviewer, dict) or type(reviewer.get('id')) is not int or reviewer.get('id') != OWNER_ID or reviewer.get('login') != OWNER_LOGIN:
        raise ValueError('Reviewer identity does not match the approved owner')
    policy = payload.get('deployment_branch_policy')
    if not isinstance(policy, dict) or policy.get('protected_branches') is not False or policy.get('custom_branch_policies') is not True:
        raise ValueError('Explicit release branch restriction is required')
    # The documented REST response omits the administrator-bypass setting.
    # Owner must verify it is disabled in the settings UI before credential use.


def require_branch_policy(payload):
    policies = payload.get('branch_policies') if isinstance(payload, dict) else None
    if not isinstance(policies, list) or payload.get('total_count') != 1 or len(policies) != 1:
        raise ValueError('Exactly one approved release branch policy is required')
    policy = policies[0]
    if not isinstance(policy, dict) or policy.get('name') != RELEASE_BRANCH or policy.get('type') != 'branch':
        raise ValueError('Unexpected branch or tag policy')


def api(repository, endpoint):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('Invalid repository')
    response = subprocess.check_output(['gh', 'api', 'repos/' + repository + '/' + endpoint], text=True, stderr=subprocess.PIPE)
    return json.loads(response)


def wait_source(repository, sha, timeout=900):
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Invalid source SHA')
    deadline = time.monotonic() + timeout
    while True:
        if source_state(api(repository, 'commits/' + sha + '/check-runs?per_page=100')):
            return
        if time.monotonic() >= deadline:
            raise ValueError('Exact-source checks did not complete')
        time.sleep(10)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('source', 'environment'))
    parser.add_argument('--environment', choices=ENVIRONMENTS)
    args = parser.parse_args()
    try:
        repository = os.environ['GITHUB_REPOSITORY']
        if args.mode == 'source':
            wait_source(repository, os.environ['GITHUB_SHA'])
        else:
            require_owner_dispatch(dict(os.environ))
            if not args.environment:
                raise ValueError('Environment is required')
            require_environment(api(repository, 'environments/' + args.environment))
            require_branch_policy(api(repository, 'environments/' + args.environment + '/deployment-branch-policies?per_page=100'))
        print('Native release ' + args.mode + ' guard passed; no external mutation performed')
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError):
        print('Native release guard failed; verify required checks or approved solo-owner environment protections', file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
