ALTER TABLE public.categories
ALTER COLUMN user_id DROP NOT NULL;

INSERT INTO public.categories (name, user_id)
SELECT defaults.name, NULL
FROM (
  VALUES
    ('Salário'),
    ('Aluguel'),
    ('Alimentação'),
    ('Transporte'),
    ('Outros')
) AS defaults(name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories c
  WHERE c.user_id IS NULL
    AND LOWER(c.name) = LOWER(defaults.name)
);
