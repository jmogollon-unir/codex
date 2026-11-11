require('dotenv').config();

const crypto = require('node:crypto');
const express = require('express');
const mongoSanitize = require('express-mongo-sanitize');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const {
  PORT = 3000,
  MONGODB_URI,
  MONGODB_DB,
  MONGODB_USERS_COLLECTION = 'users',
  BCRYPT_ROUNDS = 12,
} = process.env;

const bcryptRounds = Number(BCRYPT_ROUNDS);
if (!MONGODB_URI || !MONGODB_DB) {
  throw new Error('MONGODB_URI and MONGODB_DB must be configured.');
}
if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15.');
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb', strict: true }));
// Removes MongoDB operator keys recursively; the schema below also requires scalar strings.
app.use(mongoSanitize({ replaceWith: '_' }));

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
});
const users = () => client.db(MONGODB_DB).collection(MONGODB_USERS_COLLECTION);

const credentialsSchema = Joi.object({
  username: Joi.string().trim().min(1).max(64).required(),
  password: Joi.string()
    .min(12)
    .max(72)
    .custom((value, helpers) => {
      // bcrypt only uses the first 72 bytes; reject longer UTF-8 values to avoid ambiguity.
      if (Buffer.byteLength(value, 'utf8') > 72) return helpers.error('string.max');
      return value;
    })
    .required(),
}).unknown(false);

// A random dummy hash lets unknown usernames take the bcrypt comparison path too.
let dummyPasswordHash;

app.post('/auth', async (req, res, next) => {
  const { error, value } = credentialsSchema.validate(req.body, {
    abortEarly: false,
    convert: false,
  });

  if (error) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Provide a username and password in the required format.',
    });
  }

  try {
    const user = await users().findOne(
      { username: value.username },
      { projection: { _id: 1, passwordHash: 1 } },
    );

    const hash = user?.passwordHash || dummyPasswordHash;
    const passwordMatches = await bcrypt.compare(value.password, hash);
    if (!user || !passwordMatches) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Username or password is incorrect.',
      });
    }

    return res.status(200).json({ authenticated: true });
  } catch (cause) {
    return next(cause);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
    });
  }

  // Keep database and implementation details in server logs, never in the response.
  console.error('Authentication request failed:', error);
  return res.status(503).json({
    error: 'AUTHENTICATION_UNAVAILABLE',
    message: 'Authentication is temporarily unavailable.',
  });
});

let server;
async function start() {
  await client.connect();
  dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), bcryptRounds);
  server = app.listen(PORT, () => {
    console.log(`Authentication API listening on port ${PORT}`);
  });
}

async function shutdown() {
  if (server) server.close();
  await client.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

start().catch((error) => {
  console.error('Could not start authentication API:', error);
  process.exit(1);
});
