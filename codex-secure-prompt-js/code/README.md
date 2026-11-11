# Secure MongoDB authentication endpoint

`POST /auth` validates a JSON `username` and `password`, looks up the user by an exact string username, and verifies the submitted password against its bcrypt hash.

## Run

1. Run `npm install`.
2. Copy `.env.example` to `.env` and configure MongoDB.
3. Run `npm start`.

The MongoDB users collection must store bcrypt hashes in a `passwordHash` field. For example, generate a hash in trusted account-creation code with `bcrypt.hash(password, 12)`; never store plaintext passwords. Restrict the MongoDB user to the required database and collection.

## Request

```sh
curl -X POST http://localhost:3000/auth \
  -H 'Content-Type: application/json' \
  -d '{"username":"ana","password":"a-long-example-password"}'
```

- `200`: `{"authenticated":true}`
- `400`: malformed JSON, invalid fields, missing fields, or additional fields
- `401`: same generic response for an unknown username and an incorrect password
- `503`: authentication infrastructure error, without exposing internal details

Input passes through `express-mongo-sanitize` and a strict Joi schema. The schema accepts only scalar strings, so request objects cannot be used as MongoDB query operators. Passwords are never trimmed or logged, and UTF-8 password values over bcrypt's 72-byte limit are rejected. Use HTTPS, rate limiting, and a session or signed token when deploying this endpoint publicly.
