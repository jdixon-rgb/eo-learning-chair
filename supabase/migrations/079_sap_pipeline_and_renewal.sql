-- 079_sap_pipeline_and_renewal.sql
-- Two new dimensions on saps:
--   1. Prospect pipeline — for SAPs the chair is courting but hasn't
--      onboarded yet. status='prospect' + a pipeline_stage moves
--      through Lead → Contacted → Meeting → Negotiating → Signed.
--      On Signed → graduate, set status='active' and clear the stage.
--   2. Renewal intent — for active SAPs. SAP Chair tags each as
--      Renewing / Uncertain / Not renewing. Rolled up to the
--      President and Executive Director dashboards so leadership has
--      early warning about at-risk partner relationships.

-- 1. Loosen the status check constraint so 'prospect' is accepted.
alter table public.saps drop constraint if exists saps_status_check;
alter table public.saps
  add constraint saps_status_check
  check (status in ('active', 'inactive', 'prospect'));

-- 2. Pipeline stage column — null when not in the prospect pipeline.
alter table public.saps
  add column if not exists pipeline_stage text
  check (pipeline_stage is null or pipeline_stage in
    ('lead', 'contacted', 'meeting', 'negotiating', 'signed'));

-- 3. Renewal intent + last-update timestamp + free-form note.
alter table public.saps
  add column if not exists renewal_status text
  check (renewal_status is null or renewal_status in
    ('renewing', 'uncertain', 'not_renewing'));

alter table public.saps
  add column if not exists renewal_status_updated_at timestamptz;

alter table public.saps
  add column if not exists renewal_notes text;
