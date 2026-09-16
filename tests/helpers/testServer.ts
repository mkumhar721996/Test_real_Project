import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { app } from '../../src/app.ts';

export interface TestServer {
  baseUrl: string;
  close(): Promise<void>;
}

export async function startTestServer(): Promise<TestServer> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
