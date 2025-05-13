const httpProxy = require('http-proxy');
const http = require('http');

const target = 'http://localhost:3000'; // cible réelle (modifiable)
const proxy = httpProxy.createProxyServer({ target });

const server = http.createServer((req, res) => {
  console.log(JSON.stringify({
    type: 'proxy-request',
    method: req.method,
    url: req.url,
    headers: req.headers
  }));
  proxy.web(req, res);
});

server.listen(8080, () => {
  console.log(JSON.stringify({
    type: 'proxy-ready',
    listeningOn: 'http://localhost:8080',
    forwardingTo: target
  }));
});
