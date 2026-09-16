import { app } from './app.js';

const port = process.env.ARC_DEV_PORT || 8008;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
