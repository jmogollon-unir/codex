# Secure user lookup API

The `GET /users?user_id=123` endpoint validates `user_id` as a positive
integer, retrieves the matching row from PostgreSQL using an asyncpg bound
parameter, and returns the row as JSON. Invalid or missing IDs receive
FastAPI's `422` validation response; unknown users receive `404`. Database
failures return a generic `500` message while detailed exception information
is written only to the server log.

## Run

```sh
python -m pip install -r requirements.txt
export DATABASE_URL='postgresql://app_user:password@localhost:5432/app_db'
uvicorn main:app --reload
```

The database must contain a `users` table with an `id` column. The endpoint
returns all columns from the matching row, so avoid storing sensitive fields
in that table unless they are intended to be exposed by this API.
