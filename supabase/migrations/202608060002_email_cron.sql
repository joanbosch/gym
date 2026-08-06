create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Configure these Vault secrets in the production project before enabling:
-- select vault.create_secret('https://PROJECT.supabase.co', 'project_url');
-- select vault.create_secret('PUBLISHABLE_KEY', 'publishable_key');
-- select cron.schedule('process-email-outbox', '* * * * *', $$
--   select net.http_post(
--     url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/process-email-outbox',
--     headers := jsonb_build_object('Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='publishable_key')),
--     body := '{}'::jsonb
--   );
-- $$);
