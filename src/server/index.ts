import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleRequest } from './app.ts';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await readBody(req) : undefined;

  return new Request(url, { method: req.method, headers, body });
}

async function writeWebResponse(response: Response, res: ServerResponse): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

const server = createServer((req, res) => {
  toWebRequest(req)
    .then((webRequest) => handleRequest(webRequest))
    .then((webResponse) => writeWebResponse(webResponse, res))
    .catch((error) => {
      console.error(error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
});

const port = Number(process.env.ARC_DEV_PORT ?? 8010);
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
