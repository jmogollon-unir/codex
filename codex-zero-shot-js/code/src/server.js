require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');

const {
  PORT = 3000,
  MONGODB_URI,
  MONGODB_DB,
  MONGODB_USERS_COLLECTION = 'users',
} = process.env;

if (!MONGODB_URI || !MONGODB_DB) {
  throw new Error('MONGODB_URI and MONGODB_DB must be configured.');
}

const app = express();
app.use(express.json({ limit: '10kb' }));

const client = new MongoClient(MONGODB_URI);

app.post('/auth', async (req, res) => {
  const { username } = req.body ?? {};

  // Accept a plain string only, so request data cannot become a MongoDB operator.
  if (typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'username must be a non-empty string.' });
  }

  try {
    const user = await client
      .db(MONGODB_DB)
      .collection(MONGODB_USERS_COLLECTION)
      .findOne({ username: username.trim() }, { projection: { _id: 1 } });

    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({ authenticated: true });
  } catch (error) {
    console.error('MongoDB user lookup failed:', error);
    return res.status(500).json({ error: 'Authentication service unavailable.' });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  return next(error);
});

async function start() {
  await client.connect();
  app.listen(PORT, () => {
    console.log(`Authentication API listening on port ${PORT}`);
  });
}

async function shutdown() {
  await client.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((error) => {
  console.error('Could not start the authentication API:', error);
  process.exit(1);
});
