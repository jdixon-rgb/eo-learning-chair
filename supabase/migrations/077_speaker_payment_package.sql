-- 077_speaker_payment_package.sql
-- Add the fields needed by the "Send payment package to ED" feature:
--   • chapter-level executive_director_email (default recipient)
--   • per-speaker payment terms (deposit, final, due dates, notes) so we can
--     surface them in the email body without forcing the ED to open the PDF
--   • audit fields tracking when a payment package was last sent and to whom

alter table public.chapters
  add column if not exists executive_director_email text;

alter table public.speaker_pipeline
  add column if not exists deposit_amount integer,
  add column if not exists deposit_due_date date,
  add column if not exists final_payment_amount integer,
  add column if not exists final_payment_due_date date,
  add column if not exists payment_terms_notes text default '',
  add column if not exists ed_package_sent_at timestamptz,
  add column if not exists ed_package_sent_to text;
