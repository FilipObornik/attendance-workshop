DO $$ BEGIN
  CREATE TYPE "attendance_type" AS ENUM ('entry', 'exit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL,
  "barcode_token" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_barcode_token_uq" ON "users" ("barcode_token");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "attendance_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "type" "attendance_type" NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  "auto_closed" boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "attendance_logs_user_time_idx"
  ON "attendance_logs" ("user_id", "timestamp");
