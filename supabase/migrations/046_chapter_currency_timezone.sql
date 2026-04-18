-- Add currency + timezone columns to chapters so each chapter can display
-- budget figures and event times in its own local context.
--
-- `currency` — ISO 4217 three-letter code (USD, EUR, GBP, CNY, JPY, AUD, CAD…).
--              Defaults to USD for backward compatibility; EO Arizona stays USD.
-- `timezone` — IANA timezone identifier (America/Phoenix, Europe/Madrid,
--              Asia/Shanghai, etc.). Defaults to America/Phoenix for EO Arizona.
--
-- Both are plain text so we don't have to maintain an enum; the UI will
-- constrain inputs to sensible choices.
--
-- Idempotent: safe to re-run.

alter table public.chapters
  add column if not exists currency text not null default 'USD';

alter table public.chapters
  add column if not exists timezone text not null default 'America/Phoenix';

notify pgrst, 'reload schema';
