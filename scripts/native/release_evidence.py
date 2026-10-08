"""Native version resolution and artifact evidence; never signs or uploads."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import sys
import zipfile

APP_ID = 'ca.ashbi.habittracker'
WIDGET_ID = APP_ID + '.FaithfulDaysWidget'
ROOT = Path(__file__).resolve().parents[2]


def digest(path):
    checksum = hashlib.sha256()
    with Path(path).open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            checksum.update(chunk)
    return checksum.hexdigest()


def build_number(value):
    if isinstance(value, bool) or not re.fullmatch(r'[1-9][0-9]*', str(value)):
        raise ValueError('Build must be a positive integer without leading zeros')
    number = int(value)
    if number > 2100000000:
        raise ValueError('Build exceeds the Play versionCode limit')
    return number


def resolve(root=ROOT, build='', version='', ref='', expected_sha=''):
    package = json.loads((root / 'package.json').read_text())
    canonical = package['version']
    if not isinstance(canonical, str) or not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', canonical):
        raise ValueError('Package version must be three canonical numeric components')
    if version and version != canonical:
        raise ValueError('Version override must match package.json')
    if ref.startswith('refs/tags/') and ref != 'refs/tags/v' + canonical:
        raise ValueError('Version tag must match package.json exactly')
    baseline = build_number(json.loads((root / 'native-release.json').read_text())['buildNumber'])
    chosen = build_number(build or baseline)
    if chosen < baseline:
        raise ValueError('Build cannot be below the committed buildNumber')
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    if not re.fullmatch(r'[0-9a-f]{40}', sha) or (expected_sha and expected_sha != sha):
        raise ValueError('Source commit does not match the expected checkout')
    return {'schemaVersion': 1, 'version': canonical, 'buildNumber': chosen,
            'sourceCommit': sha, 'packageLockSha256': digest(root / 'package-lock.json')}


def check_xcode_defaults(metadata, root=ROOT):
    text = (root / 'ios/App/App.xcodeproj/project.pbxproj').read_text()
    versions = re.findall(r'MARKETING_VERSION = ([^;]+);', text)
    builds = re.findall(r'CURRENT_PROJECT_VERSION = ([^;]+);', text)
    baseline = json.loads((root / 'native-release.json').read_text())['buildNumber']
    if len(versions) != 4 or len(builds) != 4 or any(v != metadata['version'] for v in versions) or any(b != str(baseline) for b in builds):
        raise ValueError('Xcode app/widget Debug/Release defaults drifted from canonical inputs')


def validate_metadata(metadata):
    if not isinstance(metadata, dict) or metadata.get('schemaVersion') != 1:
        raise ValueError('Unsupported release metadata')
    if not isinstance(metadata.get('version'), str) or not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', metadata['version']):
        raise ValueError('Invalid metadata version')
    build_number(metadata.get('buildNumber'))
    for field, length in [('sourceCommit', 40), ('packageLockSha256', 64)]:
        if not isinstance(metadata.get(field), str) or not re.fullmatch('[0-9a-f]{' + str(length) + '}', metadata[field]):
            raise ValueError('Invalid source metadata')


def bundle_record(plist, metadata, expected_id):
    if (not isinstance(plist, dict) or plist.get('CFBundleIdentifier') != expected_id or
            plist.get('CFBundleShortVersionString') != metadata['version'] or
            plist.get('CFBundleVersion') != str(metadata['buildNumber'])):
        raise ValueError('Artifact bundle identity/version/build does not match resolved inputs')
    return {'identifier': expected_id, 'version': plist['CFBundleShortVersionString'],
            'buildNumber': plist['CFBundleVersion']}


def inspect_ipa(path, metadata):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(set(names)) != len(names) or any('..' in name.split('/') for name in names):
            raise ValueError('Ambiguous IPA entries')
        apps = [name for name in names if re.fullmatch(r'Payload/[^/]+\.app/Info.plist', name)]
        if len(apps) != 1:
            raise ValueError('Expected one app bundle in IPA')
        base = apps[0].removesuffix('Info.plist')
        widgets = [name for name in names if name.startswith(base) and re.fullmatch(re.escape(base) + r'PlugIns/[^/]+\.appex/Info.plist', name)]
        if len(widgets) != 1:
            raise ValueError('Expected one embedded widget in IPA')
        records = []
        for name, bundle_id in [(apps[0], APP_ID), (widgets[0], WIDGET_ID)]:
            if archive.getinfo(name).file_size > 1000000:
                raise ValueError('Bundle plist is unexpectedly large')
            records.append(bundle_record(plistlib.loads(archive.read(name)), metadata, bundle_id))
        return records


def inspect_android(badging, metadata):
    lines = [line for line in badging.splitlines() if line.startswith('package:')]
    if len(lines) != 1:
        raise ValueError('Expected one Android package record')
    fields = dict(re.findall(r"(name|versionCode|versionName)='([^']*)'", lines[0]))
    if fields != {'name': APP_ID, 'versionCode': str(metadata['buildNumber']), 'versionName': metadata['version']}:
        raise ValueError('Android artifact identity/version/build does not match resolved inputs')
    return [{'identifier': APP_ID, 'version': fields['versionName'], 'buildNumber': fields['versionCode']}]


def record(path, metadata, platform, badging=''):
    validate_metadata(metadata)
    if not path.is_file() or path.stat().st_size == 0:
        raise ValueError('Artifact must be a nonempty regular file')
    bundles = inspect_ipa(path, metadata) if platform == 'ios' else inspect_android(badging, metadata)
    return dict(metadata, platform=platform, artifact={'filename': path.name, 'bytes': path.stat().st_size,
                'sha256': digest(path)}, bundles=bundles, signingVerification='not-performed',
                storeProcessing='not-verified', deviceInstallation='not-verified')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    resolver = sub.add_parser('resolve')
    resolver.add_argument('--build', default=os.environ.get('BUILD_INPUT', ''))
    resolver.add_argument('--version', default=os.environ.get('VERSION_INPUT', ''))
    resolver.add_argument('--output', required=True)
    resolver.add_argument('--github-env', default='')
    sub.add_parser('check-defaults')
    recorder = sub.add_parser('record')
    recorder.add_argument('--metadata', required=True)
    recorder.add_argument('--artifact', required=True)
    recorder.add_argument('--platform', choices=['ios', 'android'], required=True)
    recorder.add_argument('--aapt', default='')
    recorder.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        if args.command == 'check-defaults':
            check_xcode_defaults(resolve())
            print('Xcode app/widget defaults match canonical inputs')
            return
        if args.command == 'resolve':
            result = resolve(build=args.build, version=args.version, ref=os.environ.get('GITHUB_REF', ''), expected_sha=os.environ.get('GITHUB_SHA', ''))
            check_xcode_defaults(result)
        else:
            metadata = json.loads(Path(args.metadata).read_text())
            validate_metadata(metadata)
            # Bind the record to this checkout's current inputs, not arbitrary JSON.
            expected = resolve(build=str(metadata.get('buildNumber', '')))
            if metadata != expected:
                raise ValueError('Metadata differs from the current source inputs')
            if args.platform == 'android' and not args.aapt:
                raise ValueError('Android evidence requires the SDK aapt tool')
            badging = subprocess.check_output([args.aapt, 'dump', 'badging', args.artifact], text=True, stderr=subprocess.PIPE) if args.platform == 'android' else ''
            result = record(Path(args.artifact), metadata, args.platform, badging)
        Path(args.output).write_text(json.dumps(result, indent=2) + '\n')
        if args.command == 'resolve' and args.github_env:
            with Path(args.github_env).open('a') as output:
                output.write('MARKETING_VERSION=' + result['version'] + '\nCURRENT_PROJECT_VERSION=' + str(result['buildNumber']) + '\nFD_NATIVE_BUILD=' + str(result['buildNumber']) + '\n')
        print('Native ' + args.command + ' evidence written; no signing/upload performed')
    except (ValueError, KeyError, OSError, zipfile.BadZipFile, plistlib.InvalidFileException, subprocess.CalledProcessError):
        print('Native release validation failed; check canonical inputs and artifact identity/version privately', file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
