import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('routing', pathlib.Path(__file__).with_name('diagnose-routing.py'))
routing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(routing)


class RoutingFacts(unittest.TestCase):
    def test_scopes_and_redacts_targets(self):
        doc = {'http': {'routers': {'ours': {'rule': 'Host(`jwhabits.ashbi.ca`)', 'service': 'app'}, 'other': {'rule': 'Host(`other.example`)', 'service': 'private'}}, 'services': {'app': {'loadBalancer': {'servers': [{'url': 'http://secret:password@127.0.0.1:18080/private?token=secret'}]}}}}}
        self.assertEqual(routing.route_summary(doc), [{'router': 'ours', 'service': 'app', 'targets': [{'scheme': 'http', 'host': '127.0.0.1', 'port': 18080}]}])

    def test_reports_missing_backend_without_inventing_one(self):
        self.assertEqual(routing.route_summary({'http': {'routers': {'ours': {'rule': 'Host(`jwhabits.ashbi.ca`)', 'service': 'missing'}}}})[0]['targets'], [])
        self.assertEqual(routing.route_summary({}), [])


if __name__ == '__main__':
    unittest.main()
