const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.FE_PORT) || 5000;
const root = __dirname;

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.jsx': 'text/babel; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(root, safePath === '/' ? 'index.html' : safePath);

    if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(root, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
        'Content-Type': contentTypes[ext] || 'application/octet-stream'
    });
    fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
    console.log(`UTC Helpdesk FE running at http://localhost:${PORT}`);
});
