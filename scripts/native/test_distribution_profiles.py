import copy
import datetime
from pathlib import Path
import unittest
from distribution_profiles import TEAM,GROUP,TARGETS,validate,configure

class Profiles(unittest.TestCase):
    def setUp(self):
        self.profile={'UUID':'12345678-1234-1234-1234-123456789ABC','TeamIdentifier':[TEAM],'ExpirationDate':datetime.datetime.utcnow()+datetime.timedelta(days=10),'DeveloperCertificates':[b'approved-certificate'],'Entitlements':{'application-identifier':TEAM+'.ca.ashbi.habittracker','get-task-allow':False,'com.apple.security.application-groups':[GROUP]}}
    def test_store_profile(self):
        self.assertEqual(validate(self.profile,'ca.ashbi.habittracker',b'approved-certificate'),self.profile['UUID'])
    def test_reject_device_development_enterprise_and_wrong_identity(self):
        changes=[{'ProvisionedDevices':['fake-device']},{'ProvisionsAllDevices':True},{'TeamIdentifier':['OTHER']},{'ExpirationDate':datetime.datetime.utcnow()-datetime.timedelta(days=1)},{'DeveloperCertificates':[b'wrong-certificate']},{'UUID':'invalid'}]
        for change in changes:
            with self.subTest(change=change),self.assertRaises(ValueError):validate(dict(self.profile,**change),'ca.ashbi.habittracker',b'approved-certificate')
        for change in [{'get-task-allow':True},{'application-identifier':TEAM+'.other.app'},{'com.apple.security.application-groups':['wrong-group']}]:
            profile=copy.deepcopy(self.profile);profile['Entitlements'].update(change)
            with self.subTest(change=change),self.assertRaises(ValueError):validate(profile,'ca.ashbi.habittracker',b'approved-certificate')
    def test_configure_only_expected_release_targets(self):
        root=Path(__file__).resolve().parents[2]
        original=(root/'ios/App/App.xcodeproj/project.pbxproj').read_text()
        result=configure(original,{target:self.profile['UUID'] for target in TARGETS})
        self.assertEqual(result.count('PROVISIONING_PROFILE_SPECIFIER'),2)
        self.assertEqual(result.count('CODE_SIGN_STYLE = Manual;'),2)
        self.assertEqual(result.count('MARKETING_VERSION = 5.3.0;'),4)
        self.assertEqual(result.count('CURRENT_PROJECT_VERSION = 530;'),4)
        with self.assertRaises(ValueError):configure(result,{target:self.profile['UUID'] for target in TARGETS})

if __name__=='__main__':unittest.main()
