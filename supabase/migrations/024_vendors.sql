-- 024_vendors.sql
-- Member Vendor Exchange: any business in the Arizona metro area that EO members use.
-- Members can add vendors, rate them (1-5 stars), and write reviews.

-- ── 1. vendors table ───────────────────────────────────────────
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  address text default '',
  phone text default '',
  website text default '',
  metro_area text not null default 'Phoenix Metro',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendors_chapter on public.vendors(chapter_id);
create index if not exists idx_vendors_category on public.vendors(category);
create index if not exists idx_vendors_name on public.vendors(name);

-- ── 2. vendor_reviews table ────────────────────────────────────
create table if not exists public.vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  chapter_member_id uuid not null references public.chapter_members(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  review_text text default '',
  upvotes int not null default 0,
  downvotes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_reviews_vendor on public.vendor_reviews(vendor_id);
create index if not exists idx_vendor_reviews_member on public.vendor_reviews(chapter_member_id);

-- One review per member per vendor
alter table public.vendor_reviews
  add constraint vendor_reviews_unique_member_vendor unique (vendor_id, chapter_member_id);

-- ── 3. RLS for vendors ─────────────────────────────────────────
alter table public.vendors enable row level security;

-- Anyone authenticated can read vendors
create policy "Authenticated can view vendors" on public.vendors
  for select using (true);

-- Members can insert vendors for their chapter
create policy "Members can insert vendors" on public.vendors
  for insert with check (
    public.is_super_admin()
    or public.user_chapter_id() = chapter_id
  );

-- Members can update vendors they created; admins can update any
create policy "Owner or admin can update vendors" on public.vendors
  for update using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
    or (public.user_chapter_id() = chapter_id and created_by = auth.uid())
  );

-- Only admins can delete vendors
create policy "Admin can delete vendors" on public.vendors
  for delete using (
    public.is_super_admin()
    or public.is_chapter_admin(chapter_id)
  );

-- ── 4. RLS for vendor_reviews ──────────────────────────────────
alter table public.vendor_reviews enable row level security;

-- Anyone authenticated can read reviews
create policy "Authenticated can view vendor_reviews" on public.vendor_reviews
  for select using (true);

-- Members can insert reviews (scoped via vendor's chapter)
create policy "Members can insert vendor_reviews" on public.vendor_reviews
  for insert with check (
    public.is_super_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and public.user_chapter_id() = v.chapter_id
    )
  );

-- Members can update their own reviews; admins can update any
create policy "Owner or admin can update vendor_reviews" on public.vendor_reviews
  for update using (
    public.is_super_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and (
          public.is_chapter_admin(v.chapter_id)
          or (public.user_chapter_id() = v.chapter_id
              and chapter_member_id = (
                select cm.id from public.chapter_members cm
                where cm.chapter_id = v.chapter_id
                  and cm.email = (select email from auth.users where id = auth.uid())
                limit 1
              ))
        )
    )
  );

-- Members can delete their own reviews; admins can delete any
create policy "Owner or admin can delete vendor_reviews" on public.vendor_reviews
  for delete using (
    public.is_super_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id
        and (
          public.is_chapter_admin(v.chapter_id)
          or (public.user_chapter_id() = v.chapter_id
              and chapter_member_id = (
                select cm.id from public.chapter_members cm
                where cm.chapter_id = v.chapter_id
                  and cm.email = (select email from auth.users where id = auth.uid())
                limit 1
              ))
        )
    )
  );
