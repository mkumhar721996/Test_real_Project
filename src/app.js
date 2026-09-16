const http = require('node:http');
const { handleRequest } = require('./routes/defects');

function createApp() {
  return http.createServer((req, res) => {
    try {
      handleRequest(req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}

module.exports = { createApp };
