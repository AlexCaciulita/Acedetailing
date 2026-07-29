import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bookingHandler from './api/create-booking.js'
import enrollmentHandler from './api/create-enrollment.js'
import contactHandler from './api/create-contact.js'
import chatProxyHandler from './api/chat-proxy.js'
import { createExpressLikeResponse } from './api/response-utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    name: 'nova-detailing-api',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware('/api/create-booking', bookingHandler));
      server.middlewares.use(createApiMiddleware('/api/create-enrollment', enrollmentHandler));
      server.middlewares.use(createApiMiddleware('/api/create-contact', contactHandler));
      server.middlewares.use(createApiMiddleware('/api/chat-proxy', chatProxyHandler));
    }
  }
}

// `root: 'public'` makes Vite resolve publicDir to the nonexistent `public/public`,
// so these root-level files were silently never emitted. The service worker in
// particular must land at the origin root to get origin-wide scope.
const ROOT_STATIC_FILES = [
  'service-worker.js',
  'sitemap.xml',
  'robots.txt',
  // Vite emits a hashed copy and rewrites the <link>, but crawlers and PWA
  // tooling probe the conventional root path, so keep that resolving too.
  'manifest.webmanifest'
];

function rootStaticPlugin() {
  return {
    name: 'nova-detailing-root-static',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');

      for (const name of ROOT_STATIC_FILES) {
        const from = path.resolve(__dirname, 'public', name);
        if (!fs.existsSync(from)) {
          this.warn(`root static file missing, not copied: ${name}`);
          continue;
        }
        fs.copyFileSync(from, path.join(outDir, name));
      }

      // Vite content-hashes every asset it can see, but it cannot see the ones
      // referenced from the web manifest, from JS template strings, or from
      // absolute https://novadetailing.ro/... URLs in og:image / JSON-LD. Those
      // need their original, unhashed path to exist too.
      // Recursive: services-data.js references /assets/services/*.jpg as plain
      // strings, so that subdirectory needs its unhashed path too.
      const copyTree = (from, to) => {
        fs.mkdirSync(to, { recursive: true });
        for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
          if (entry.name.startsWith('.')) continue;
          const src = path.join(from, entry.name);
          const dest = path.join(to, entry.name);
          if (entry.isDirectory()) copyTree(src, dest);
          else if (entry.isFile()) fs.copyFileSync(src, dest);
        }
      };
      copyTree(path.resolve(__dirname, 'public/assets'), path.join(outDir, 'assets'));
    }
  }
}

export default defineConfig({
  root: 'public',
  plugins: [apiPlugin(), rootStaticPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'public/index.html',
        servicii: 'public/servicii.html',
        rezervare: 'public/rezervare.html',
        scoala: 'public/scoala.html',
        despre: 'public/despre.html',
        blog: 'public/blog.html',
        contact: 'public/contact.html',
        faq: 'public/faq.html',
        politici: 'public/politici.html',
        vin: 'public/vin.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
