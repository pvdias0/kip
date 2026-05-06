DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'username'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users RENAME COLUMN username TO email;
  END IF;
END $$;

ALTER TABLE public.users
  ALTER COLUMN email TYPE VARCHAR(255);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS name VARCHAR(100);

UPDATE public.users
SET name = COALESCE(NULLIF(TRIM(name), ''), NULLIF(TRIM(SPLIT_PART(email, '@', 1)), ''), 'Usuario')
WHERE name IS NULL OR TRIM(name) = '';

ALTER TABLE public.users
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.users
SET email_verified = TRUE
WHERE email_verified IS NULL;

ALTER TABLE public.users
  ALTER COLUMN email_verified SET DEFAULT FALSE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.users
SET is_admin = FALSE
WHERE is_admin IS NULL;
