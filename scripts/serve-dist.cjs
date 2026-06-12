#!/usr/bin/env node
// SPA-aware static server for local QA. Mirrors the nginx.conf in this
// repo: serves files from a build dist, falls back to index.html on
// missing paths so client-side routes work, and disables caching for
// the service worker.
//
// Usage: node scripts/serve-dist.cjs [dist-path] [port]
//   defaults: ./dist, 8765
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(process.argv[2] || './dist');
const PORT = parseInt(process.argv[3] || '8765', 10);
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain',
};

if (!fs.existsSync(DIST)) {
  console.error(`dist directory not found: ${DIST}`);
  console.error(`run \`npm run build\` first, or pass an explicit path.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const candidate = url === '/' ? '/index.html' : url;
  const filePath = path.join(DIST, candidate);

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      // SPA fallback to index.html for client-side routes
      const indexPath = path.join(DIST, 'index.html');
      fs.readFile(indexPath, (e2, indexData) => {
        if (e2) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('no dist/index.html — run `npm run build` first');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`read error: ${err.message}`);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
      // Service worker must never be cached (PWA update flow)
      if (url === '/sw.js' || url === '/sw.mjs') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SPA server on http://127.0.0.1:${PORT} (serving ${DIST})`);
});
