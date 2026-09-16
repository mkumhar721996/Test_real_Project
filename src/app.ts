import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleDefectsRoute } from './routes/defects.ts';

export async function app(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const handled = await handleDefectsRoute(req, res);
  if (!handled) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
}
