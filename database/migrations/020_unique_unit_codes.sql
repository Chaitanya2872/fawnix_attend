-- Enforce unit-code uniqueness in the database.
--
-- 019 created a plain (non-unique) index on LOWER(unit_code), so the rule was
-- only ever enforced by the application's SELECT-then-INSERT check. That check
-- is a time-of-check/time-of-use race: two concurrent creates can both pass it,
-- and any other writer (a bulk import, a script, direct SQL) bypasses it
-- entirely. departments.department_code has been UNIQUE since 016 -- this
-- brings the unit tables in line.
--
-- Idempotent, and safe to run against data that already contains duplicates:
-- existing duplicates are suffixed rather than deleted, so nothing is lost and
-- an operator can reconcile them afterwards.

-- ---------------------------------------------------------------------------
-- 1. De-duplicate existing codes, keeping the earliest row untouched.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    target_table TEXT;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['working_units', 'payroll_units'] LOOP
        EXECUTE format($fmt$
            WITH ranked AS (
                SELECT
                    id,
                    unit_code,
                    ROW_NUMBER() OVER (
                        PARTITION BY LOWER(TRIM(unit_code))
                        ORDER BY id
                    ) AS occurrence
                FROM %I
                WHERE NULLIF(TRIM(COALESCE(unit_code, '')), '') IS NOT NULL
            )
            UPDATE %I AS t
            SET unit_code = ranked.unit_code || '-DUP' || ranked.occurrence
            FROM ranked
            WHERE t.id = ranked.id
              AND ranked.occurrence > 1
        $fmt$, target_table, target_table);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Replace the non-unique lookup index with a unique one.
--    Partial (NOT NULL) so historic rows without a code stay valid.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_working_units_unit_code_lookup;
DROP INDEX IF EXISTS idx_payroll_units_unit_code_lookup;

CREATE UNIQUE INDEX IF NOT EXISTS idx_working_units_unit_code_unique
    ON working_units (LOWER(TRIM(unit_code)))
    WHERE NULLIF(TRIM(COALESCE(unit_code, '')), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_units_unit_code_unique
    ON payroll_units (LOWER(TRIM(unit_code)))
    WHERE NULLIF(TRIM(COALESCE(unit_code, '')), '') IS NOT NULL;
