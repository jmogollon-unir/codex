# Zero-shot JavaScript MongoDB authentication endpoint

This Express service exposes `POST /auth`. It accepts a JSON body containing a `username` string, looks up that username directly in MongoDB, and responds with `authenticated: true` when a matching document exists.

## Configure and run

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set the MongoDB URI, database, and (if needed) users collection.
3. Start the service with `npm start`.

The configured collection should contain user documents with a `username` field. Keep `.env` private and use a MongoDB account restricted to the required database and collection.

## Request example

```sh
curl -X POST http://localhost:3000/auth \
  -H 'Content-Type: application/json' \
  -d '{"username":"ana"}'
```

Responses are `200 {"authenticated":true}` when a username exists, `401 {"authenticated":false}` when it does not, and `400` for a missing or invalid username.

**Security note:** this endpoint checks whether a username exists; a username alone does not prove the caller owns the account. For real authentication, add a password or another credential and verify it securely (for passwords, store and compare a salted hash), then issue a session or token.
