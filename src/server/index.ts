import { createApp } from './app';

const port = Number(process.env.ARC_DEV_PORT) || 8017;
const app = createApp();

app.listen(port, () => {
  console.log(`Defect API listening on port ${port}`);
});
