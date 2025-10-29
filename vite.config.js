import { defineConfig } from 'vite'
import bookingHandler from './api/create-booking.js'
import { createExpressLikeResponse } from './api/response-utils.js'

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'public/index.html',
        servicii: 'public/servicii.html',
        configurator: 'public/configurator.html',
        rezervare: 'public/rezervare.html',
        contact: 'public/contact.html',
        faq: 'public/faq.html',
        politici: 'public/politici.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    configureServer(server) {
      server.middlewares.use('/api/create-booking', (req, res) => {
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
            await bookingHandler(req, expressRes);
          } catch (handlerError) {
            console.error('Booking handler error (dev server):', handlerError);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, message: 'Eroare server' }));
            }
          }
        });

        req.on('error', (streamError) => {
          console.error('Request stream error (dev server):', streamError);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: false, message: 'Eroare server' }));
          }
        });
      });
    }
  }
})
