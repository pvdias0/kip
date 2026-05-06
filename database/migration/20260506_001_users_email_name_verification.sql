ALTER TABLE public.users
  RENAME COLUMN username TO email;

ALTER TABLE public.users
  ALTER COLUMN email TYPE VARCHAR(255);

ALTER TABLE public.users
  ADD COLUMN name VARCHAR(100);

UPDATE public.users
SET name = COALESCE(NULLIF(TRIM(SPLIT_PART(email, '@', 1)), ''), 'Usuario')
WHERE name IS NULL;

ALTER TABLE public.users
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.users
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.users
  ADD COLUMN email_verification_token VARCHAR(64);

ALTER TABLE public.users
  ADD COLUMN email_verification_expires TIMESTAMP;

ALTER TABLE public.users
  ALTER COLUMN email_verified SET DEFAULT FALSE;
