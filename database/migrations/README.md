# Database Migrations

This directory contains SQL migration files that are automatically executed when the application starts.

## Migration System

The migration system is managed by the `database/connection.py` module and tracks executed migrations in the `schema_migrations` table.

### How It Works

1. **On Application Startup** (`app.py`):
   - `init_database()` creates base tables and schema
   - `run_migrations()` executes all pending migration files

2. **Migration Tracking**:
   - A `schema_migrations` table tracks which migrations have been executed
   - Each migration file name is stored with execution timestamp
   - Migrations are only run once, even if the app restarts

3. **Naming Convention**:
   - Migration files are named with numeric prefixes: `001_*.sql`, `002_*.sql`, etc.
   - Sorted alphabetically, executed in order
   - Each file should be a complete, idempotent SQL script

## Existing Migrations

### 001_add_compoff_trigger.sql

**Purpose**: Auto-populate comp-off records when attendance is updated

**What It Does**:

1. **`is_compoff_session` Column**
   - Added to `attendance` table if not exists
   - Tracks whether a session is comp-off eligible (non-working day)

2. **`is_working_day()` Function**
   - PostgreSQL PL/pgSQL function
   - Checks if a given date is a working day
   - Considers:
     - **Sundays** (day_of_week = 0)
     - **2nd and 4th Saturdays** (day_of_week = 6, week_of_month in [2,4])
     - **Organization holidays** (from `organization_holidays` table)
   - Returns `TRUE` if working day, `FALSE` if non-working

3. **`mark_compoff_session()` Function**
   - Triggered on `BEFORE INSERT OR UPDATE` for `attendance` table
   - Automatically sets `is_compoff_session = TRUE` for non-working days
   - Gets employee code from `employees` table and checks working day

4. **`populate_compoff_on_clockout()` Function**
   - Triggered on `AFTER UPDATE` for `attendance` table
   - Only fires when `logout_time` is being set (clock-out happening)
   - Creates `overtime_records` entry if:
     - Session is on non-working day, OR
     - `is_compoff_session` flag is true
   - Records include:
     - Employee info (emp_code, email, name)
     - Attendance link (attendance_id)
     - Work date and day type
     - Standard/actual/extra hours calculation
     - Status: `'eligible'`
     - Expiry: 90 days from work_date
     - Recording deadline: 30 days from work_date

5. **Triggers**:
   - `trigger_mark_compoff_on_insert`: Sets flag when attendance created
   - `trigger_mark_compoff_on_update`: Sets flag if attendance modified
   - `trigger_populate_compoff_on_clockout`: Creates overtime record on clock-out

6. **Backfill**:
   - Updates all existing non-working day Todays Activity to mark them as comp-off sessions

## Adding New Migrations

To add a new migration:

1. Create a new SQL file with next numeric prefix:
   ```bash
   # If 001_*.sql exists, create:
   002_feature_name.sql
   ```

2. Write your migration SQL:
   ```sql
   -- Description of what this migration does
   
   -- Use DO $$ ... END $$; for idempotent operations
   DO $$
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM ...) THEN
           -- Your DDL here
       END IF;
   END $$;
   
   -- Track table updates, function creation, triggers, etc.
   ```

3. Make migrations **idempotent** (safe to run multiple times):
   - Use `IF NOT EXISTS` for table/column creation
   - Use `DROP IF EXISTS` with triggers
   - Use `CREATE OR REPLACE` for functions
   - Check constraints before creation

4. Test locally before committing:
   ```bash
   # Stop the app
   # Delete schema_migrations records for your migration (if testing multiple times)
   # Restart the app and verify logs
   ```

## Migration Execution

Migrations are executed automatically when the application starts:

```
INFO: 🔧 Initializing database...
INFO: ✓ Database initialized successfully
INFO: 🔧 Running database migrations...
INFO: Running migration: 001_add_compoff_trigger.sql
INFO: ✓ Migration executed successfully: 001_add_compoff_trigger.sql
INFO: ✓ All migrations completed
```

## Troubleshooting

**Migration fails on startup**:
- Check PostgreSQL error logs
- Verify all referenced tables exist (base tables created in `init_database()`)
- Ensure syntax is valid PostgreSQL

**Migration doesn't run**:
- Check `schema_migrations` table for the migration name
- If already recorded but needs to re-run, delete the row from `schema_migrations`
- Verify file is in `database/migrations/` directory with `.sql` extension

**Need to rollback**:
- Manually execute rollback SQL directly against database
- Remove row from `schema_migrations` table if migration was partially successful

## Migration Dependencies

The `001_add_compoff_trigger.sql` migration depends on these base tables (created by `init_database()`):
- `attendance` table
- `employees` table  
- `overtime_records` table
- `organization_holidays` table

These must exist before the migration runs. They are created in `init_database()`.

## Best Practices

1. ✅ **One concern per migration**: Each migration should handle one logical feature
2. ✅ **Clear naming**: Use descriptive names that indicate what changed
3. ✅ **Idempotent**: Safe to run multiple times without errors
4. ✅ **Comments**: Include comments explaining what each part does
5. ✅ **Small files**: Keep migrations focused and readable
6. ✅ **Test thoroughly**: Test locally before pushing to production
7. ✅ **Version control**: Always commit migrations to git with your changes

## Examples

### Example: Adding a new column
```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='table_name' AND column_name='new_column'
    ) THEN
        ALTER TABLE table_name ADD COLUMN new_column VARCHAR(100);
    END IF;
END $$;
```

### Example: Creating an index
```sql
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column_name);
```

### Example: Creating a function
```sql
CREATE OR REPLACE FUNCTION function_name() RETURNS BOOLEAN AS $$
BEGIN
    -- Function body
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## References

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- PL/pgSQL Guide: https://www.postgresql.org/docs/current/plpgsql.html
- Triggers: https://www.postgresql.org/docs/current/triggers.html
