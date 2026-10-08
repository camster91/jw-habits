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


def require_environment(payload):
    rules = payload.get('protection_rules') if isinstance(payload, dict) else None
    if not isinstance(rules, list):
        raise ValueError('Invalid environment response')
    if not any(isinstance(rule, dict) and rule.get('type') == 'required_reviewers' and
               rule.get('prevent_self_review') is True and isinstance(rule.get('reviewers'), list) and
               any(isinstance(actor, dict) and actor.get('type') in ('User', 'Team') and
                   isinstance(actor.get('reviewer'), dict) and isinstance(actor['reviewer'].get('id'), int) and
                   actor['reviewer']['id'] > 0 for actor in rule['reviewers']) for rule in rules):
        raise ValueError('Independent reviewer/self-review protection is missing')


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
            if not args.environment:
                raise ValueError('Environment is required')
            require_environment(api(repository, 'environments/' + args.environment))
        print('Native release ' + args.mode + ' guard passed; no external mutation performed')
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError):
        print('Native release guard failed; verify required checks or independent environment protections', file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
