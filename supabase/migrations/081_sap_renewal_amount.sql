-- 081_sap_renewal_amount.sql
-- Adds the proposed renewal amount alongside the existing
-- annual_sponsorship (which is the current contribution). The two
-- can differ — a partner whose tier or scope is changing might be
-- contributing $X today and renewing at $Y. Both numbers are
-- restricted in the UI to the SAP Chair (edit), and President /
-- President-Elect / Executive Director (view); other roles never
-- see them.

alter table public.saps
  add column if not exists renewal_amount numeric;
