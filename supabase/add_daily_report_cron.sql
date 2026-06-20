-- Job pg_cron: relatório diário às 23:30 de Brasília (02:30 UTC)
SELECT cron.schedule(
  'daily-report',
  '30 2 * * *',
  $$
  SELECT net.http_get(
    'https://basilicopizzas.com.br/api/reports/daily?secret=basilico-report-2025'
  );
  $$
);
