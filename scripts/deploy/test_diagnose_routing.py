import importlib.util
import pathlib
import unittest
import tempfile
import json
from unittest.mock import patch

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

    def test_runtime_metadata_excludes_credentials_and_labels(self):
        doc = {'Name': '/coolify-proxy', 'Config': {'Image': 'traefik@sha256:example', 'Env': ['TOKEN=secret'], 'Labels': {'password': 'secret'}}, 'State': {'Status': 'running'}, 'HostConfig': {'NetworkMode': 'host'}, 'Mounts': [{'Source': '/proxy', 'Destination': '/traefik'}]}
        summary = routing.runtime_summary(doc)
        self.assertEqual(summary['name'], 'coolify-proxy')
        self.assertEqual(summary['networkMode'], 'host')
        self.assertNotIn('secret', json.dumps(summary))

    def test_provider_resolves_actual_mount_not_legacy_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            (root / 'traefik.yml').write_text('{}')
            doc = {'Mounts': [{'Source': folder, 'Destination': '/traefik'}]}
            self.assertEqual(routing.provider_paths(doc, lambda _: {'providers': {'file': {'directory': '/traefik/dynamic'}}}), [('directory', root / 'dynamic')])
            self.assertEqual(routing.provider_paths({'Mounts': []}, lambda _: {}), [])

    def test_provider_refuses_mount_escape(self):
        with tempfile.TemporaryDirectory() as folder:
            (pathlib.Path(folder) / 'traefik.yml').write_text('{}')
            doc = {'Mounts': [{'Source': folder, 'Destination': '/traefik'}]}
            for value in ('/other/private', '/traefik/../private'):
                with self.subTest(value=value), self.assertRaises(ValueError):
                    routing.provider_paths(doc, lambda _: {'providers': {'file': {'filename': value}}})

    def test_diagnosis_reads_live_provider_and_scopes_routes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            (root / 'dynamic').mkdir()
            (root / 'traefik.yml').write_text(json.dumps({'providers': {'file': {'directory': '/traefik/dynamic'}}}))
            (root / 'dynamic' / 'app.yml').write_text(json.dumps({'http': {'routers': {'app': {'rule': 'Host(`jwhabits.ashbi.ca`)', 'service': 'app'}, 'other': {'rule': 'Host(`other.example`)', 'service': 'secret'}}, 'services': {'app': {'loadBalancer': {'servers': [{'url': 'http://token:secret@127.0.0.1:18080/?secret=1'}]}}}}}))
            doc = {'Name': '/coolify-proxy', 'Mounts': [{'Source': folder, 'Destination': '/traefik'}]}
            with patch.object(routing.Path, 'is_file', autospec=True, side_effect=lambda path: str(path) != '/opt/traefik/dynamic/routers.yml' and path.exists()):
                result = routing.diagnose(lambda path: json.loads(path.read_text()), lambda name: doc if name == 'coolify-proxy' else None)
            self.assertEqual(len(result['configuredProviderRoutes']), 1)
            self.assertEqual(result['configuredProviderRoutes'][0]['routes'][0]['targets'], [{'scheme': 'http', 'host': '127.0.0.1', 'port': 18080}])
            self.assertEqual(result['appContainers'], [])
            self.assertNotIn('secret', json.dumps(result))


if __name__ == '__main__':
    unittest.main()
