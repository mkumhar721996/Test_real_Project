import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireRole } from '../middleware/requireRole.ts';
import { deleteDefect, getDefect, listDefects } from '../services/defectService.ts';

const isAdmin = requireRole('ADMIN');

function sendJson(res: ServerResponse, status: number, body?: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

export async function handleDefectsRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments[0] !== 'defects') return false;

  const id = segments[1];
  const role = req.headers['x-user-role'];

  if (req.method === 'GET' && segments.length === 1) {
    sendJson(res, 200, listDefects());
    return true;
  }

  if (req.method === 'GET' && segments.length === 2) {
    const defect = getDefect(id);
    if (!defect) {
      sendJson(res, 404, { error: 'Not Found' });
      return true;
    }
    sendJson(res, 200, defect);
    return true;
  }

  if (req.method === 'DELETE' && segments.length === 2) {
    if (!isAdmin(typeof role === 'string' ? role : undefined)) {
      sendJson(res, 403, { error: 'Forbidden' });
      return true;
    }
    const deleted = deleteDefect(id);
    if (!deleted) {
      sendJson(res, 404, { error: 'Not Found' });
      return true;
    }
    res.writeHead(204);
    res.end();
    return true;
  }

  return false;
}
