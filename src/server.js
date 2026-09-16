const { createApp } = require('./app');

try {
  process.loadEnvFile();
} catch (err) {
  // .env not present; fall back to whatever is already in process.env
}

const port = process.env.ARC_DEV_PORT || 8005;

createApp().listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
