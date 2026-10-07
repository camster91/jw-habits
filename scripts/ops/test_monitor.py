import datetime
import unittest
from monitor import validate_expiry, validate_release


class MetadataMonitor(unittest.TestCase):
    def test_wrong_revision_fails(self):
        with self.assertRaises(ValueError):
            validate_release({'revision': 'old', 'version': '5.1.0'}, 'expected')
        validate_release({'revision': 'expected', 'version': '5.1.0'}, 'expected')

    def test_expiring_certificate_fails(self):
        now = datetime.datetime(2026, 10, 7, tzinfo=datetime.timezone.utc)
        with self.assertRaises(ValueError):
            validate_expiry('Oct 14 00:00:00 2026 GMT', now)
        self.assertEqual(validate_expiry('Nov 7 00:00:00 2026 GMT', now), 31)


if __name__ == '__main__':
    unittest.main()
