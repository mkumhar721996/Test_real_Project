import { handleCreateDefect } from './routes/defects.ts';

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/api/defects') {
    return handleCreateDefect(request);
  }

  return new Response('Not Found', { status: 404 });
}
