-- ============================================================
-- 059 Fix is_invited_member overload introduced by 058
-- ============================================================
-- Migration 058 added defaults to two arguments. PostgreSQL determines
-- function signatures by argument types only (defaults are ignored), so
-- the new is_invited_member(text, text) was created ALONGSIDE the
-- original is_invited_member(text) instead of replacing it.
--
-- Result: PostgREST receives a call like { check_email: '...' } and
-- finds two candidate functions (the old one matches exactly; the new
-- one matches via the default for check_phone). Resolution fails and
-- the RPC returns an error — which the LoginPage surfaces as
-- "this email isn't registered." Members get locked out.
--
-- Fix: drop the old single-arg signature. Only the dual-arg version
-- remains. Both email-only and phone-only calls then resolve cleanly.

drop function if exists public.is_invited_member(text);
