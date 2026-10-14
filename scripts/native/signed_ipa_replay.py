"""Validate an owner-selected retained IPA; never signs or uploads."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import zipfile

from release_guard import OWNER_ID, RELEASE_BRANCH, require_owner_dispatch
from release_evidence import inspect_ipa, resolve

REPOSITORY = 'camster91/jw-habits'


def selection(context):
    selected = {}
    for key, pattern in {'run': r'[1-9][0-9]*', 'attempt': r'[1-9][0-9]*',
                         'source': r'[0-9a-f]{40}', 'sha256': r'[0-9a-f]{64}'}.items():
        value = context.get('REPLAY_' + key.upper(), '')
        if not isinstance(value, str) or not re.fullmatch(pattern, value):
            raise ValueError('Invalid retained candidate selection')
        selected[key] = value
    if context.get('REPLAY_SKIP_UPLOAD', 'false') != 'false':
        raise ValueError('Simulator-only and retained IPA modes cannot be combined')
    return selected


def validate_run(run, jobs, approvals, selected):
    if (run.get('id') != int(selected['run']) or run.get('run_attempt') != int(selected['attempt'])
            or run.get('head_sha') != selected['source'] or run.get('status') != 'completed'
            or run.get('conclusion') != 'success' or run.get('event') != 'workflow_dispatch'
            or run.get('head_branch') != RELEASE_BRANCH
            or run.get('path') != '.github/workflows/ios-testflight.yml'
            or run.get('repository', {}).get('full_name') != REPOSITORY
            or any(run.get(k, {}).get('id') != OWNER_ID for k in ('actor', 'triggering_actor'))):
        raise ValueError('Run does not match the owner-approved signing candidate')
    entries = jobs.get('jobs', [])
    if any(sum(j.get('name') == n for j in entries) != 1 for n in ('preflight', 'archive', 'upload')):
        raise ValueError('Ambiguous signing jobs')
    named = {j['name']: j for j in entries}
    if any(named.get(n, {}).get('conclusion') != 'success' for n in ('preflight', 'archive')):
        raise ValueError('Signing jobs did not succeed')
    if named.get('upload', {}).get('conclusion') != 'skipped':
        raise ValueError('Reconcile the previous upload outcome before replay')
    signing_reviews = [a for a in approvals
                       if any(e.get('name') == 'ios-signing' for e in a.get('environments', []))]
    if (not signing_reviews or any(a.get('state') != 'approved'
                                  or a.get('user', {}).get('id') != OWNER_ID for a in signing_reviews)):
        raise ValueError('Expected owner signing approval is missing')


def choose_artifact(payload, selected):
    name = f"faithful-days-approved-ipa-{selected['run']}-{selected['attempt']}"
    matches = [a for a in payload.get('artifacts', []) if a.get('name') == name]
    if len(matches) != 1 or matches[0].get('expired') is not False:
        raise ValueError('Exactly one unexpired retained candidate is required')
    artifact = matches[0]
    if type(artifact.get('id')) is not int or artifact['id'] < 1:
        raise ValueError('Invalid retained artifact identity')
    if artifact.get('workflow_run', {}).get('head_sha') != selected['source']:
        raise ValueError('Artifact source differs from the selected signing run')
    return artifact['id']


def api(endpoint):
    response = subprocess.check_output(['gh', 'api', 'repos/' + REPOSITORY + '/' + endpoint],
                                       text=True, stderr=subprocess.PIPE)
    return json.loads(response)


def plan(selected):
    endpoint = 'actions/runs/' + selected['run']
    run = api(endpoint + '/attempts/' + selected['attempt'])
    jobs = api(endpoint + '/attempts/' + selected['attempt'] + '/jobs?per_page=100')
    validate_run(run, jobs, api(endpoint + '/approvals'), selected)
    return dict(selected, artifactId=choose_artifact(api(endpoint + '/artifacts?per_page=100'), selected))


def verify(directory, source_root, selected):
    metadata = json.loads((directory / 'native-version.json').read_text())
    evidence = json.loads((directory / 'native-artifact.json').read_text())
    expected = resolve(root=source_root, build=str(metadata['buildNumber']),
                       version=metadata['version'], expected_sha=selected['source'])
    if metadata != expected or any(evidence.get(k) != v for k, v in expected.items()):
        raise ValueError('Retained metadata differs from the signed source checkout')
    artifact = directory / 'release-candidate/app.ipa'
    digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    if (digest != selected['sha256'] or evidence.get('artifact', {}).get('sha256') != digest
            or evidence.get('artifact', {}).get('bytes') != artifact.stat().st_size
            or evidence.get('platform') != 'ios'):
        raise ValueError('Retained IPA does not match the separately inspected checksum')
    bundles = inspect_ipa(artifact, metadata)
    if evidence.get('bundles') != bundles:
        raise ValueError('Actual app/widget versions differ from retained evidence')
    with zipfile.ZipFile(artifact) as archive:
        manifests = [n for n in archive.namelist() if n.endswith('/public/release.json')]
        if len(manifests) != 1:
            raise ValueError('One embedded release manifest is required')
        release = json.loads(archive.read(manifests[0]))
    if release != {'version': metadata['version'], 'revision': selected['source']}:
        raise ValueError('Embedded release identity differs from signed source')
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=('plan', 'verify'))
    parser.add_argument('--directory', type=Path, default=Path('approved-ipa'))
    parser.add_argument('--source-root', type=Path, default=Path('candidate-source'))
    args = parser.parse_args()
    try:
        require_owner_dispatch(dict(os.environ))
        selected = selection(os.environ)
        if args.mode == 'plan':
            value = plan(selected)
            Path('replay-plan.json').write_text(json.dumps(value, indent=2) + '\n')
            print('Retained signing run, approval and artifact identity verified')
        else:
            value = verify(args.directory, args.source_root, selected)
            Path('replay-native-version.json').write_text(json.dumps(value, indent=2) + '\n')
            print('Exact retained IPA checksum, source and bundle identity verified')
    except (ValueError, KeyError, TypeError, OSError, subprocess.CalledProcessError, zipfile.BadZipFile):
        print('Retained IPA validation failed; reconcile source, approval or artifact evidence', file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
