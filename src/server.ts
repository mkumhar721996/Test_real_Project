import http from 'node:http';
import { app } from './app.ts';

const port = Number(process.env.ARC_DEV_PORT ?? 3000);

http.createServer(app).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
