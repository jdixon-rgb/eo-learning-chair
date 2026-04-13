-- 036_vendor_sap_tier.sql
-- Add tier and SAP linkage to vendors so SAP partners surface
-- as premium vendors in the Vendor Exchange.

alter table public.vendors
  add column if not exists tier text not null default 'community'
    check (tier in ('community', 'sap_partner')),
  add column if not exists sap_id uuid references public.saps(id) on delete set null;

create index if not exists idx_vendors_sap on public.vendors(sap_id) where sap_id is not null;
create index if not exists idx_vendors_tier on public.vendors(tier) where tier = 'sap_partner';
