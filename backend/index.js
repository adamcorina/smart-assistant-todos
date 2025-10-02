require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { handleMessage } = require('./routes/message');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

app.post('/message', handleMessage);

app.listen(PORT, () => {
  console.log(`Notes agent listening on http://localhost:${PORT}`);
});