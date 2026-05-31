# Database Migrations

This project now uses a real migration runner for versioned SQL files in `database/migrations/`.

## How startup works

1. `init_database()` in `database/connection.py`
   - Creates bootstrap tables and default seed rows needed for a brand-new database.
   - Does not contain upgrade/backfill logic for existing deployments.

2. `run_migrations()` in `database/connection.py`
   - Ensures `schema_migrations` exists.
   - Reads `database/migrations/*.sql` in sorted filename order.
   - Skips files already recorded in `schema_migrations`.
   - Runs each pending migration in its own transaction.
   - Records the filename only after the migration succeeds.
   - Stops startup immediately if any migration fails.

## Tracking table

Executed migrations are tracked in:

```sql
schema_migrations (
  filename varchar(255) primary key,
  executed_at timestamp not null default now()
)
```

## Rules for future schema changes

- Do not hide schema upgrades in `init_database()`.
- Do not add ad-hoc `ALTER TABLE` backfills in Python startup code.
- Every schema change must be added as a new SQL file in `database/migrations/`.
- Use the next numeric prefix, for example `009_add_example_column.sql`.
- Keep migrations idempotent where practical so recovery is easier.

## Authoring a migration

1. Create a new file:

```text
database/migrations/009_short_description.sql
```

2. Write standard PostgreSQL SQL.

3. Prefer plain SQL without top-level `BEGIN` / `COMMIT`.
   - The application already wraps each migration in a transaction.
   - The runner strips simple standalone transaction wrapper lines from older migration files for compatibility.

4. Make the migration safe for reruns when possible:
   - `ADD COLUMN IF NOT EXISTS`
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - constraint existence checks inside `DO $$ ... $$`

## Failure behavior

If a migration fails:

- that migration is rolled back
- its filename is not inserted into `schema_migrations`
- application startup raises an error and stops

This is intentional so broken schema changes are visible immediately.

## Operational notes

- Existing older migration files are still honored.
- `008_backfill_bootstrap_schema.sql` moves prior inline Python schema-upgrade logic into the versioned migration system.
- For local retesting of a migration, remove its row from `schema_migrations` only after you have reset or repaired the affected schema state.
