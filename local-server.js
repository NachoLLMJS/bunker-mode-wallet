const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 4177;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};

http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err,data)=>{
    if (err) { res.writeHead(404, {'content-type':'text/plain; charset=utf-8'}); return res.end('Not found'); }
    res.writeHead(200, {'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control':'no-store'});
    res.end(data);
  });
}).listen(port, '127.0.0.1', ()=>console.log(`BUNKER MODE WALLET ready at http://127.0.0.1:${port}`));
