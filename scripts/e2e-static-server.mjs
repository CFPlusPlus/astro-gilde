import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const host = process.env.HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '4321', 10);
const rootDir = path.resolve(process.cwd(), 'dist', 'client');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRequestTarget(urlPathname) {
  const safePath = path.normalize(decodeURIComponent(urlPathname)).replace(/^(\.\.(\/|\\|$))+/, '');
  const requestPath = safePath.startsWith(path.sep) ? safePath.slice(1) : safePath;
  const absolutePath = path.join(rootDir, requestPath);

  let filePath = absolutePath;
  if (await fileExists(filePath)) {
    const details = await stat(filePath);
    if (details.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } else if (await fileExists(path.join(absolutePath, 'index.html'))) {
    filePath = path.join(absolutePath, 'index.html');
  } else {
    return null;
  }

  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(rootDir)) {
    return null;
  }

  return resolvedPath;
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);
    const filePath = await resolveRequestTarget(requestUrl.pathname);

    if (!filePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'no-cache',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Server error');
  }
});

server.listen(port, host, () => {
  console.log(`E2E static server listening on http://${host}:${port}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
