const express = require('express');
const currentUser = require('./middleware/currentUser');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(express.json());
app.use(currentUser);
app.use('/api/dashboard', dashboardRoutes);

module.exports = app;
