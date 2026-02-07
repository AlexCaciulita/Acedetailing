import { defineConfig } from 'vite'
import bookingHandler from './api/create-booking.js'
import enrollmentHandler from './api/create-enrollment.js'
import chatProxyHandler from './api/chat-proxy.js'
import { createExpressLikeResponse } from './api/response-utils.js'

// Helper to create API middleware for the Vite dev server
function createApiMiddleware(path, handler) {
  return (req, res, next) => {
    if (req.url !== path) return next();

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }

    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch (parseError) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: false, message: 'Corpul cererii nu este JSON valid' }));
        return;
      }

      try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        const expressRes = createExpressLikeResponse(res);
        await handler(req, expressRes);
      } catch (handlerError) {
        console.error(`Handler error for ${path} (dev server):`, handlerError);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: false, message: 'Eroare server' }));
        }
      }
    });

    req.on('error', (streamError) => {
      console.error(`Request stream error for ${path} (dev server):`, streamError);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ success: false, message: 'Eroare server' }));
      }
    });
  };
}

function apiPlugin() {
  return {
    name: 'ace-detailing-api',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware('/api/create-booking', bookingHandler));
      server.middlewares.use(createApiMiddleware('/api/create-enrollment', enrollmentHandler));
      server.middlewares.use(createApiMiddleware('/api/chat-proxy', chatProxyHandler));
    }
  }
}

export default defineConfig({
  root: 'public',
  plugins: [apiPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'public/index.html',
        servicii: 'public/servicii.html',
        configurator: 'public/configurator.html',
        rezervare: 'public/rezervare.html',
        scoala: 'public/scoala.html',
        despre: 'public/despre.html',
        galerie: 'public/galerie.html',
        blog: 'public/blog.html',
        contact: 'public/contact.html',
        faq: 'public/faq.html',
        politici: 'public/politici.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
