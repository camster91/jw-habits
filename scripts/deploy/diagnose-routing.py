"""Read-only, credential-redacted facts for this app's public routing failures."""
import json
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


if __name__ == '__main__':
    try:
        import yaml
        path = Path('/opt/traefik/dynamic/routers.yml')
        print('App routing configuration:', json.dumps(route_summary(yaml.safe_load(path.read_text()) or {})))
    except Exception as error:
        # Exception messages can quote config values; report only the type.
        print('Routing configuration unavailable:', type(error).__name__)
