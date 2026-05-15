
-- Volunteers
CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  registration_number TEXT NOT NULL UNIQUE,
  fingerprint TEXT,
  ip_address TEXT,
  exam_completed BOOLEAN NOT NULL DEFAULT false,
  score INTEGER,
  total_questions INTEGER,
  percentage NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_volunteers_fingerprint ON public.volunteers(fingerprint);

-- Questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registration number sequence
CREATE SEQUENCE public.tijcef_reg_seq START 1;

CREATE OR REPLACE FUNCTION public.next_registration_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  n := nextval('public.tijcef_reg_seq');
  RETURN 'TIJCEF/2026/' || lpad(n::text, 3, '0');
END;
$$;

-- Enable RLS
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- All write/read for volunteers/questions happens via server functions using the admin client.
-- Lock down direct client access by default (no policies = no access).
-- We don't add anon-readable policies on questions because the correct_answer column would leak.
