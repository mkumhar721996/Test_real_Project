const app = require('./app');

const port = process.env.ARC_DEV_PORT || 8018;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
