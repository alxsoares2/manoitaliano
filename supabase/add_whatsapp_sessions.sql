CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  phone      text        PRIMARY KEY,
  state      jsonb       NOT NULL DEFAULT '{}',
  messages   jsonb       NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full whatsapp_sessions"
  ON public.whatsapp_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
