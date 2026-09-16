import express from 'express';
import { attachUser } from './middleware/authStub';
import { defectsRouter } from './routes/defects';

export function createApp() {
  const app = express();
  app.use(attachUser);
  app.use(defectsRouter);
  return app;
}
