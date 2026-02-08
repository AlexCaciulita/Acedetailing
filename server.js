import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bookingHandler from './api/create-booking.js';
import enrollmentHandler from './api/create-enrollment.js';
import chatProxyHandler from './api/chat-proxy.js';
import payuCreateOrderHandler from './api/payu-create-order.js';
import payuNotifyHandler from './api/payu-notify.js';
import { createExpressLikeResponse } from './api/response-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;
const distDir = path.join(__dirname, 'dist');
const PUBLIC_DIR = fs.existsSync(distDir) ? distDir : path.join(__dirname, 'public');

// MIME types for known file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const renderHtmlResponse = (statusCode, title, heading, message, extraStyles = '') => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${statusCode} - ${title}</title>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
      h1 { color: #B8962F; }
      ${extraStyles}
    </style>
  </head>
  <body>
    <h1>${heading}</h1>
    <p>${message}</p>
    <a href="/">Inapoi la pagina principala</a>
  </body>
  </html>
`;

const buildRequestPathname = (req) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    return requestUrl.pathname || '/';
  } catch {
    return req.url || '/';
  }
};

const server = http.createServer((req, res) => {
  let pathname = buildRequestPathname(req);

  // API routing
  const apiRoutes = {
    '/api/create-booking': bookingHandler,
    '/api/create-enrollment': enrollmentHandler,
    '/api/chat-proxy': chatProxyHandler,
    '/api/payu-create-order': payuCreateOrderHandler,
    '/api/payu-notify': payuNotifyHandler
  };

  const apiHandler = apiRoutes[pathname];
  if (apiHandler) {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        if (body) {
          req.body = JSON.parse(body);
        } else {
          req.body = {};
        }
      } catch (parseError) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Corpul cererii nu este JSON valid' }));
        return;
      }

      try {
        const expressLikeRes = createExpressLikeResponse(res);
        await apiHandler(req, expressLikeRes);
      } catch (handlerError) {
        console.error(`API handler error (${pathname}):`, handlerError);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, message: 'Eroare server' }));
        }
      }
    });

    req.on('error', (streamError) => {
      console.error('Request stream error:', streamError);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: 'Eroare server' }));
      }
    });

    return;
  }

  if (pathname.endsWith('/')) {
    pathname = `${pathname}index.html`;
  } else if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, pathname);
  const normalizedPath = path.normalize(filePath);

  // Prevent path traversal outside the public directory
  if (!normalizedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end(
      renderHtmlResponse(
        403,
        'Acces interzis',
        '403 - Acces interzis',
        'Resursa solicitata nu este disponibila.'
      )
    );
    return;
  }

  fs.access(normalizedPath, fs.constants.F_OK, (accessError) => {
    if (accessError) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(
        renderHtmlResponse(
          404,
          'Pagina nu a fost gasita',
          '404 - Pagina nu a fost gasita',
          `Fisierul <strong>${pathname}</strong> nu exista.`
        )
      );
      return;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    let contentType = mimeTypes[ext] || 'application/octet-stream';

    // Ensure UTF-8 charset for text-based responses so browsers render content correctly
    if (
      contentType.startsWith('text/') ||
      contentType === 'application/javascript' ||
      contentType === 'application/json' ||
      contentType === 'image/svg+xml'
    ) {
      contentType = `${contentType}; charset=utf-8`;
    }

    fs.readFile(normalizedPath, (readError, data) => {
      if (readError) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(
          renderHtmlResponse(
            500,
            'Eroare server',
            '500 - Eroare interna de server',
            'Nu s-a putut citi fisierul.'
          )
        );
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Nova Detailing server pornit pe http://localhost:${PORT}`);
  console.log(`Servind fisiere din: ${PUBLIC_DIR}`);
  console.log(`Acceseaza website-ul la: http://localhost:${PORT}`);
});

const shutdown = () => {
  console.log('\nServer oprit gracios');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default server;
