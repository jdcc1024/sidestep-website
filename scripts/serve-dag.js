#!/usr/bin/env node
/**
 * DAG Viewer Local Server
 *
 * Serves the dag-viewer.html and dag.json from the project root.
 * The viewer polls dag.json every 2 seconds for updates.
 *
 * Usage:
 *   node scripts/serve-dag.js [port]
 *
 * Default port: 3100
 * Opens: http://localhost:3100/dag-viewer.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2]) || 3100;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  let filePath = path.join(ROOT, req.url.split('?')[0]);
  if (filePath === ROOT + '/' || filePath === ROOT + '\\') {
    filePath = path.join(ROOT, 'dag-viewer.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + req.url);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  DAG Viewer running at:`);
  console.log(`  → http://localhost:${PORT}\n`);
  console.log(`  Watching: ${path.join(ROOT, 'dag.json')}`);
  console.log(`  Polling interval: 2 seconds\n`);
  console.log(`  Press Ctrl+C to stop.\n`);
});
