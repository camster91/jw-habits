"""Validate App Store profiles and set per-target distribution signing in CI."""
import argparse
import base64
import datetime
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess

TEAM='NVJ5UY3T2X'
GROUP='group.ca.ashbi.habittracker'
TARGETS={'504EC3181FED79650016851F':('ca.ashbi.habittracker','IOS_APP_STORE_PROFILE_BASE64'), '060726CB3EB2448E97362ACE':('ca.ashbi.habittracker.FaithfulDaysWidget','IOS_WIDGET_STORE_PROFILE_BASE64')}

def validate(profile, bundle, certificate):
    entitlements=profile.get('Entitlements',{})
    if profile.get('TeamIdentifier')!=[TEAM] or entitlements.get('application-identifier')!=TEAM+'.'+bundle:
        raise ValueError('App Store profile belongs to another app or team')
    if profile.get('ProvisionedDevices') or profile.get('ProvisionsAllDevices') or entitlements.get('get-task-allow') is not False:
        raise ValueError('An App Store distribution profile is required')
    if entitlements.get('com.apple.security.application-groups')!=[GROUP]:
        raise ValueError('The app and widget must share the approved App Group')
    if profile['ExpirationDate']<=datetime.datetime.utcnow():
        raise ValueError('App Store profile has expired')
    if not re.fullmatch(r'[0-9A-Fa-f-]{36}',profile.get('UUID','')):
        raise ValueError('Invalid profile identity')
    if certificate not in profile.get('DeveloperCertificates',[]):
        raise ValueError('Profile does not authorize the approved signing certificate')
    return profile['UUID']

def configure(project, profiles):
    for target,profile in profiles.items():
        pattern=re.compile(r'('+target+r' /\* Release \*/ = \{.*?buildSettings = \{)(.*?)(\n\s*\};)',re.S)
        found=list(pattern.finditer(project))
        if len(found)!=1 or 'CODE_SIGN_STYLE = Automatic;' not in found[0][2]:
            raise ValueError('Release target signing configuration changed')
        settings=found[0][2].replace('CODE_SIGN_STYLE = Automatic;', 'CODE_SIGN_STYLE = Manual;\n\t\t\t\tDEVELOPMENT_TEAM = '+TEAM+';\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "'+profile+'";')
        project=project[:found[0].start(2)]+settings+project[found[0].end(2):]
    return project

def run(args,input=None):
    result=subprocess.run(args,input=input,capture_output=True)
    if result.returncode: raise ValueError('Private distribution credential preparation failed')
    return result.stdout

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--project',default='ios/App/App.xcodeproj/project.pbxproj');args=parser.parse_args()
    temporary=Path(os.environ['RUNNER_TEMP'])/'faithful-distribution';temporary.mkdir(mode=0o700,exist_ok=True)
    p12=temporary/'distribution.p12';p12.write_bytes(base64.b64decode(os.environ['IOS_DISTRIBUTION_P12_BASE64'],validate=True));p12.chmod(0o600)
    pem=run(['openssl','pkcs12','-in',str(p12),'-clcerts','-nokeys','-passin','env:IOS_DISTRIBUTION_P12_PASSWORD'])
    certificate=run(['openssl','x509','-outform','DER'],input=pem)
    fingerprint=os.environ['IOS_DISTRIBUTION_CERT_SHA256'].lower()
    if not re.fullmatch('[0-9a-f]{64}',fingerprint) or hashlib.sha256(certificate).hexdigest()!=fingerprint:
        raise ValueError('Distribution certificate differs from the approved identity')
    directory=Path.home()/'Library/MobileDevice/Provisioning Profiles';directory.mkdir(parents=True,exist_ok=True)
    profiles={}
    for target,(bundle,variable) in TARGETS.items():
        file=temporary/(target+'.mobileprovision');file.write_bytes(base64.b64decode(os.environ[variable],validate=True));file.chmod(0o600)
        profile=plistlib.loads(run(['security','cms','-D','-i',str(file)]))
        uuid=validate(profile,bundle,certificate);installed=directory/(uuid+'.mobileprovision');installed.write_bytes(file.read_bytes());installed.chmod(0o600);profiles[target]=uuid
    project=Path(args.project);project.write_text(configure(project.read_text(),profiles))
    print('App and widget App Store profiles verified; no device registration is required.')

if __name__=='__main__':main()
