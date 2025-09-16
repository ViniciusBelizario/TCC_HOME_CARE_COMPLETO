// file: src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadEnv } = require('./config/env');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/error');

const app = express();
const { UPLOAD_DIR } = loadEnv();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.use('/api', routes);

app.use(errorHandler);

module.exports = { app };
