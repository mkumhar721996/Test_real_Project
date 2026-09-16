const defectStore = require('../store/defectStore');

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments[0] !== 'defects') {
    return notFound(res);
  }

  if (segments.length === 1) {
    if (req.method === 'GET') {
      const role = req.headers['x-user-role'];
      const userId = req.headers['x-user-id'];
      let defects = defectStore.list();
      if (role === 'reporter') {
        defects = defects.filter((d) => d.reporterId === userId);
      }
      return sendJson(res, 200, defects);
    }
    return notFound(res);
  }

  if (segments.length === 2) {
    const id = segments[1];

    if (req.method === 'GET') {
      const defect = defectStore.getById(id);
      if (!defect) return notFound(res);
      return sendJson(res, 200, defect);
    }

    if (req.method === 'DELETE') {
      if (req.headers['x-user-role'] !== 'admin') return notFound(res);
      const removed = defectStore.remove(id);
      if (!removed) return notFound(res);
      res.writeHead(204);
      return res.end();
    }
  }

  return notFound(res);
}

module.exports = { handleRequest };
