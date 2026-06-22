-- Job pg_cron: sync de fotos novas toda segunda às 18h Brasília (21h UTC)
SELECT cron.schedule(
  'instagram-sync',
  '0 21 * * 1',
  $$
  SELECT net.http_get(
    'https://basilicopizzas.com.br/api/instagram/sync?secret=basilico-report-2025'
  );
  $$
);
