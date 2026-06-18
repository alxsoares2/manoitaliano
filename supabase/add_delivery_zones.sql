-- Tabela de zonas de entrega dinâmica
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood   text        NOT NULL UNIQUE,
  delivery_fee   numeric(10,2) NOT NULL,
  estimated_time text        NOT NULL DEFAULT '40-55 min',
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Leitura pública (checkout do site precisa consultar)
CREATE POLICY "public read delivery_zones"
  ON public.delivery_zones FOR SELECT
  USING (true);

-- Escrita apenas via service_role (admin routes)
CREATE POLICY "service_role write delivery_zones"
  ON public.delivery_zones FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Popula com todos os bairros do código (valores originais + R$0,99, arredondados para ,99)
INSERT INTO public.delivery_zones (neighborhood, delivery_fee, estimated_time) VALUES
  ('Aeroclube',                    10.99, '40-55 min'),
  ('Água Fria',                    16.99, '40-55 min'),
  ('Altiplano Cabo Branco',        11.99, '40-55 min'),
  ('Anatólia',                     13.99, '40-55 min'),
  ('Alto do Mateus',               21.99, '40-55 min'),
  ('Bairro dos Estados',           11.99, '40-55 min'),
  ('Bairro dos Ipês',              11.99, '40-55 min'),
  ('Bairro das Indústrias',        23.99, '40-55 min'),
  ('Bairro dos Novais',            19.99, '40-55 min'),
  ('Bancários',                    14.99, '40-55 min'),
  ('Bela Vista',                   14.99, '40-55 min'),
  ('Bessa',                        11.99, '40-55 min'),
  ('Brisamar',                      9.99, '40-55 min'),
  ('Bayeux',                       23.99, '40-55 min'),
  ('Cabo Branco',                  10.99, '40-55 min'),
  ('Camboinha',                    17.99, '40-55 min'),
  ('Castelo Branco',               13.99, '40-55 min'),
  ('Centro João Pessoa',           14.99, '40-55 min'),
  ('Centro',                       14.99, '40-55 min'),
  ('Centro Cabedelo',              21.99, '40-55 min'),
  ('Centro Santa Rita',            28.99, '40-55 min'),
  ('Costa e Silva',                21.99, '40-55 min'),
  ('Cristo Redentor',              16.99, '40-55 min'),
  ('Cruz das Armas',               18.99, '40-55 min'),
  ('Cuiá',                         18.99, '40-55 min'),
  ('Costa do Sol',                 19.99, '40-55 min'),
  ('Colibris',                     16.99, '40-55 min'),
  ('Jaguaribe',                    13.99, '40-55 min'),
  ('Ernani Sátiro',                19.99, '40-55 min'),
  ('Ernesto Geisel',               18.99, '40-55 min'),
  ('Expedicionários',              11.99, '40-55 min'),
  ('Funcionários',                 19.99, '40-55 min'),
  ('Gramame',                      29.99, '40-55 min'),
  ('Grotão',                       21.99, '40-55 min'),
  ('Ilha do Bispo',                19.99, '40-55 min'),
  ('Intermares',                   14.99, '40-55 min'),
  ('Jardim Cidade Universitária',  14.99, '40-55 min'),
  ('Jardim São Paulo',             14.99, '40-55 min'),
  ('Jardim Oceania',               11.99, '40-55 min'),
  ('Jardim Planalto',              19.99, '40-55 min'),
  ('João Agripino',                10.99, '40-55 min'),
  ('Jardim C. Universitária',      13.99, '40-55 min'),
  ('João Paulo II',                19.99, '40-55 min'),
  ('José Américo',                 16.99, '40-55 min'),
  ('Manaíra',                       8.99, '40-55 min'),
  ('Mandacaru',                    11.99, '40-55 min'),
  ('Mangabeira',                   17.99, '40-55 min'),
  ('Miramar',                      10.99, '40-55 min'),
  ('Mucumagro',                    23.99, '40-55 min'),
  ('Oitizeiro',                    21.99, '40-55 min'),
  ('Varjão',                       16.99, '40-55 min'),
  ('Padre Zé',                     11.99, '40-55 min'),
  ('Paratibe',                     23.99, '40-55 min'),
  ('Pedro Gondim',                 11.99, '40-55 min'),
  ('Penha',                        16.99, '40-55 min'),
  ('Poço',                         16.99, '40-55 min'),
  ('Ponta de Campina',             15.99, '40-55 min'),
  ('Ponta dos Seixas',             16.99, '40-55 min'),
  ('Portal do Sol',                13.99, '40-55 min'),
  ('Renascer',                     13.99, '40-55 min'),
  ('Roger',                        12.99, '40-55 min'),
  ('Santa Rita',                   29.99, '40-55 min'),
  ('São José',                      9.99, '40-55 min'),
  ('Tambaú',                        9.99, '40-55 min'),
  ('Tambauzinho',                  11.99, '40-55 min'),
  ('Tambiá',                       13.99, '40-55 min'),
  ('Torre',                        11.99, '40-55 min'),
  ('Treze de Maio',                12.99, '40-55 min'),
  ('Trincheiras',                  14.99, '40-55 min'),
  ('Varadouro',                    13.99, '40-55 min'),
  ('Valentina',                    21.99, '40-55 min')
ON CONFLICT (neighborhood) DO NOTHING;
