"""Read-only, credential-redacted facts for this app's public routing failures."""
import json
import subprocess
from pathlib import Path
from urllib.parse import urlsplit


def route_summary(doc):
    http = doc.get('http', {})
    routers = http.get('routers', {})
    services = http.get('services', {})
    result = []
    for name, router in routers.items():
        if 'jwhabits.ashbi.ca' not in str(router.get('rule', '')):
            continue
        service = router.get('service', '')
        servers = services.get(service, {}).get('loadBalancer', {}).get('servers', [])
        targets = []
        for server in servers:
            parsed = urlsplit(server.get('url', ''))
            # Never print credentials, query strings, middleware or TLS keys.
            targets.append({'scheme': parsed.scheme, 'host': parsed.hostname, 'port': parsed.port})
        result.append({'router': name, 'service': service, 'targets': targets})
    return result


def runtime_summary(doc):
    """Whitelist runtime metadata; never serialize environment or raw labels."""
    return {
        'name': doc.get('Name', '').lstrip('/'),
        'image': doc.get('Config', {}).get('Image'),
        'state': doc.get('State', {}).get('Status'),
        'networkMode': doc.get('HostConfig', {}).get('NetworkMode'),
        'mounts': [{'source': mount.get('Source'), 'destination': mount.get('Destination')}
                   for mount in doc.get('Mounts', [])],
    }


def provider_paths(doc, load):
    """Resolve a file provider through the inspected container's actual mount."""
    paths = []
    for mount in doc.get('Mounts', []):
        source, destination = mount.get('Source'), mount.get('Destination')
        if not source or destination != '/traefik':
            continue
        for name in ('traefik.yml', 'traefik.yaml'):
            static = Path(source) / name
            if not static.is_file():
                continue
            provider = (load(static) or {}).get('providers', {}).get('file', {})
            for field in ('directory', 'filename'):
                value = provider.get(field)
                if not isinstance(value, str):
                    continue
                relative = Path(value).relative_to(destination)
                if '..' in relative.parts:
                    raise ValueError('Provider path escapes mount')
                host = Path(source) / relative
                paths.append((field, host))
    return paths


def diagnose(load, inspect):
    result = {'runtimes': [], 'configuredProviderRoutes': [], 'legacyRoutes': [], 'appContainers': []}
    for name in ('coolify-proxy', 'traefik', 'jw-habits', 'jw-habits-previous'):
        doc = inspect(name)
        if doc is None:
            continue
        if name.startswith('jw-habits'):
            result['appContainers'].append(runtime_summary(doc))
            continue
        result['runtimes'].append(runtime_summary(doc))
        for kind, path in provider_paths(doc, load):
            files = sorted(path.glob('*.yml')) + sorted(path.glob('*.yaml')) if kind == 'directory' else [path]
            for file in files:
                routes = route_summary(load(file) or {})
                if routes:
                    result['configuredProviderRoutes'].append({'file': str(file), 'routes': routes})
    legacy = Path('/opt/traefik/dynamic/routers.yml')
    if legacy.is_file():
        result['legacyRoutes'] = route_summary(load(legacy) or {})
    # A configured provider path is not proof of runtime routing acceptance.
    return result


def inspect_container(name):
    process = subprocess.run(['docker', 'inspect', name], capture_output=True, text=True, timeout=5)
    if process.returncode:
        return None
    return json.loads(process.stdout)[0]


if __name__ == '__main__':
    try:
        import yaml
        print('App routing diagnosis:', json.dumps(diagnose(lambda path: yaml.safe_load(path.read_text()), inspect_container)))
    except Exception as error:
        # Exception messages can quote config values; report only the type.
        print('Routing configuration unavailable:', type(error).__name__)
