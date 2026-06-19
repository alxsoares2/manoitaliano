-- Tabela de horários de funcionamento
CREATE TABLE IF NOT EXISTS public.business_hours (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week  int     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time    time    NOT NULL,
  close_time   time    NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  UNIQUE (day_of_week)
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read business_hours"
  ON public.business_hours FOR SELECT USING (true);

CREATE POLICY "service_role write business_hours"
  ON public.business_hours FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Segunda (1) a Quinta (4): 17:00–22:00
-- Sexta (5), Sábado (6), Domingo (0): 17:00–23:00
INSERT INTO public.business_hours (day_of_week, open_time, close_time, active) VALUES
  (0, '17:00', '23:00', true),
  (1, '17:00', '22:00', true),
  (2, '17:00', '22:00', true),
  (3, '17:00', '22:00', true),
  (4, '17:00', '22:00', true),
  (5, '17:00', '23:00', true),
  (6, '17:00', '23:00', true)
ON CONFLICT (day_of_week) DO NOTHING;

-- Tabela de configurações gerais (chave-valor)
CREATE TABLE IF NOT EXISTS public.store_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read store_settings"
  ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "service_role write store_settings"
  ON public.store_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Toggle de fechamento manual (false = funcionamento normal)
INSERT INTO public.store_settings (key, value) VALUES ('manually_closed', 'false')
ON CONFLICT (key) DO NOTHING;
