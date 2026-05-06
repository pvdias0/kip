--
--
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
--
--
CREATE TYPE public.entry_type AS ENUM (
    'income',
    'expense'
);
SET default_tablespace = '';
SET default_table_access_method = heap;
--
--
CREATE TABLE public.categories (
    id integer NOT NULL,
    user_id integer,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
--
--
CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
--
ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;
--
--
CREATE TABLE public.entries (
    id integer NOT NULL,
    user_id integer NOT NULL,
    category_id integer,
    type public.entry_type NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255),
    date date NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT entries_amount_check CHECK ((amount > (0)::numeric))
);
--
--
CREATE SEQUENCE public.entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
--
ALTER SEQUENCE public.entries_id_seq OWNED BY public.entries.id;
--
--
CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_token character varying(64),
    email_verification_expires timestamp without time zone,
    reset_token character varying(64),
    reset_token_expires timestamp without time zone,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
--
--
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
--
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
--
--
ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);
--
--
ALTER TABLE ONLY public.entries ALTER COLUMN id SET DEFAULT nextval('public.entries_id_seq'::regclass);
--
--
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
--
--
COPY public.categories (id, user_id, name, created_at) FROM stdin;
17	\N	Salário	2026-01-29 18:46:52.520471
18	\N	Aluguel	2026-01-29 18:46:52.522767
19	\N	Alimentação	2026-01-29 18:46:52.523261
20	\N	Transporte	2026-01-29 18:46:52.525164
21	\N	Outros	2026-01-29 18:46:52.526369
\.
--
--
COPY public.entries (id, user_id, category_id, type, amount, description, date, created_at) FROM stdin;
10	1	\N	income	2.00	teste de front	2026-01-30	2026-01-30 01:00:07.732786
11	2	21	income	80.00	Faxina 	2026-03-02	2026-03-05 08:36:12.868916
12	2	20	income	10.00	Pix da mãe 	2026-03-04	2026-03-05 08:36:36.774205
\.
--
--
COPY public.users (id, email, name, password_hash, email_verified, email_verification_token, email_verification_expires, reset_token, reset_token_expires, is_admin, created_at) FROM stdin;
1	p.vitordias@outlook.com	p.vitordias	$2b$10$ki2Z2jGHugDeDVPeZwFcwOKiimov/d5HI.HdUXEZ0TQq73uEXDjSa	t	\N	\N	\N	\N	f	2026-01-29 18:12:11.33008
2	mclarasantos2905@gmail.com	mclarasantos2905	$2b$10$R2FVv3YlY.aOnxofWZnLHuycRg4J8ig9nkAr6yxBB5ihs0ncIm.YW	t	\N	\N	\N	\N	f	2026-03-05 08:34:33.872313
\.
--
--
SELECT pg_catalog.setval('public.categories_id_seq', 21, true);
--
--
SELECT pg_catalog.setval('public.entries_id_seq', 12, true);
--
--
SELECT pg_catalog.setval('public.users_id_seq', 2, true);
--
--
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.entries
    ADD CONSTRAINT entries_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT unique_category_per_user UNIQUE (user_id, name);
--
--
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
--
--
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
--
--
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT fk_category_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
--
--
ALTER TABLE ONLY public.entries
    ADD CONSTRAINT fk_entry_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
--
--
ALTER TABLE ONLY public.entries
    ADD CONSTRAINT fk_entry_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
--
--
