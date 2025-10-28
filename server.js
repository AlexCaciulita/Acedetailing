const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types pentru diferite extensii de fișiere
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
  '.xml': 'application/xml'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Dacă pathname se termină cu '/', adaugă 'index.html'
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // Construiește calea completă către fișier
  const filePath = path.join(PUBLIC_DIR, pathname);
  
  // Verifică dacă fișierul există
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Fișierul nu există - returnează 404
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - Pagina nu a fost găsită</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #1E40AF; }
          </style>
        </head>
        <body>
          <h1>404 - Pagina nu a fost găsită</h1>
          <p>Fișierul <strong>${pathname}</strong> nu există.</p>
          <a href="/">Înapoi la pagina principală</a>
        </body>
        </html>
      `);
      return;
    }
    
    // Obține extensia fișierului pentru MIME type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Citește și servește fișierul
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>500 - Eroare server</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>500 - Eroare internă de server</h1>
            <p>Nu s-a putut citi fișierul.</p>
          </body>
          </html>
        `);
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚗 Scuderia Vision server pornit pe http://localhost:${PORT}`);
  console.log(`📁 Servind fișiere din: ${PUBLIC_DIR}`);
  console.log(`🌐 Accesează website-ul la: http://localhost:${PORT}`);
});

// Gestionează închiderea gracioasă a serverului
process.on('SIGINT', () => {
  console.log('\n🛑 Server oprit gracios');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server oprit gracios');
  server.close(() => {
    process.exit(0);
  });
});