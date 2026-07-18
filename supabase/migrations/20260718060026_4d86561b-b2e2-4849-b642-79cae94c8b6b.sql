
CREATE TABLE public.payloads (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.payloads TO anon;
GRANT SELECT, INSERT ON public.payloads TO authenticated;
GRANT ALL ON public.payloads TO service_role;

ALTER TABLE public.payloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create payloads" ON public.payloads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read payloads" ON public.payloads
  FOR SELECT TO anon, authenticated USING (true);
