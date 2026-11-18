-- SurBazaar MVP schema
-- Roles: buyer (default), producer (after admin approval), admin.

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type public.user_role as enum ('buyer', 'producer', 'admin');
create type public.producer_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.beat_status as enum ('pending', 'approved', 'rejected', 'sold_exclusive', 'removed');
create type public.licence_type as enum ('free', 'basic', 'premium', 'unlimited', 'exclusive');
create type public.order_status as enum ('pending_payment', 'paid', 'cancelled', 'refunded');
create type public.payout_status as enum ('requested', 'paid', 'rejected');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  role public.user_role not null default 'buyer',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Producers ----------
create table public.producer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stage_name text not null check (char_length(stage_name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  city text,
  bio text check (char_length(bio) <= 1000),
  sample_links text[] not null default '{}',
  status public.producer_status not null default 'pending',
  founding boolean not null default false,
  commission_rate numeric(4,3) not null default 0.200 check (commission_rate between 0 and 1),
  beat_limit int not null default 20,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Sensitive KYC + payout details: owner and admin only.
create table public.producer_private (
  user_id uuid primary key references public.producer_profiles(user_id) on delete cascade,
  legal_name text not null,
  cnic text not null check (cnic ~ '^[0-9]{5}-?[0-9]{7}-?[0-9]$'),
  phone text not null,
  payout_method text not null default 'jazzcash' check (payout_method in ('jazzcash', 'easypaisa', 'bank')),
  payout_account_title text,
  payout_account text,
  agreed_terms_at timestamptz not null default now()
);

-- ---------- Beats ----------
create or replace function public.immutable_join(text[])
returns text language sql immutable parallel safe set search_path = '' as $$ select array_to_string($1, ' ') $$;

create table public.beats (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producer_profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 2000),
  genre text not null,
  moods text[] not null default '{}',
  instruments text[] not null default '{}',
  tags text[] not null default '{}',
  bpm int check (bpm between 40 and 250),
  musical_key text,
  ai_generated boolean not null default false,
  ai_tool text,
  preview_path text,      -- public bucket "previews": tagged MP3
  artwork_path text,      -- public bucket "previews"
  has_mp3 boolean not null default false,   -- private bucket "masters": {producer}/{beat}/master.mp3
  has_wav boolean not null default false,   -- master.wav
  has_stems boolean not null default false, -- stems.zip
  file_hash text,         -- sha256 of preview/master for proof of upload & duplicate check
  status public.beat_status not null default 'pending',
  review_note text,
  plays int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(genre, '') || ' ' ||
      coalesce(public.immutable_join(tags), '') || ' ' || coalesce(public.immutable_join(moods), '') || ' ' ||
      coalesce(public.immutable_join(instruments), ''))
  ) stored
);
create index beats_status_idx on public.beats (status, published_at desc);
create index beats_producer_idx on public.beats (producer_id);
create index beats_search_idx on public.beats using gin (search);
create index beats_file_hash_idx on public.beats (file_hash);

create table public.beat_licences (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  licence_type public.licence_type not null,
  price_pkr int not null check (price_pkr >= 0),
  enabled boolean not null default true,
  unique (beat_id, licence_type),
  check ((licence_type = 'free') = (price_pkr = 0))
);

-- ---------- Cart ----------
create table public.cart_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  beat_id uuid not null references public.beats(id) on delete cascade,
  licence_type public.licence_type not null,
  created_at timestamptz not null default now(),
  primary key (user_id, beat_id)
);

-- ---------- Orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  buyer_id uuid not null references public.profiles(id),
  buyer_name text not null,
  buyer_email text,
  status public.order_status not null default 'pending_payment',
  total_pkr int not null default 0,
  payment_method text not null default 'bank_transfer',
  payment_reference text,
  admin_note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  beat_id uuid not null references public.beats(id),
  producer_id uuid not null references public.producer_profiles(user_id),
  beat_title text not null,
  producer_name text not null,
  licence_type public.licence_type not null,
  price_pkr int not null,
  commission_rate numeric(4,3) not null,
  platform_fee_pkr int not null,
  producer_earning_pkr int not null,
  licence_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_beat_idx on public.order_items (beat_id);
create index order_items_producer_idx on public.order_items (producer_id);

-- ---------- Wallet ledger + payouts ----------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producer_profiles(user_id),
  amount_pkr int not null check (amount_pkr > 0),
  method text not null,
  account_title text,
  account text,
  status public.payout_status not null default 'requested',
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index payouts_producer_idx on public.payouts (producer_id, created_at desc);

create table public.wallet_entries (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producer_profiles(user_id),
  amount_pkr int not null,
  kind text not null check (kind in ('sale', 'refund', 'payout', 'payout_reversal', 'adjustment')),
  order_item_id uuid references public.order_items(id),
  payout_id uuid references public.payouts(id),
  available_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index wallet_producer_idx on public.wallet_entries (producer_id, created_at desc);

-- ---------- Reports ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  reporter_id uuid references public.profiles(id),
  reporter_email text,
  reason text not null check (reason in ('copyright', 'uncleared_sample', 'stolen_beat', 'ai_undisclosed', 'offensive', 'other')),
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------- Site settings (payment instructions, editable by admin) ----------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  bank_name text default '',
  account_title text default '',
  iban text default '',
  raast_id text default '',
  jazzcash text default '',
  easypaisa text default '',
  payment_note text default 'Transfer the exact amount and put your order number in the reference.',
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1);

-- =====================================================================
-- Triggers guarding columns that only admins may change
-- =====================================================================
create or replace function public.guard_producer_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.founding := false; new.commission_rate := 0.200;
    new.beat_limit := 20; new.review_note := null; new.reviewed_at := null;
  else
    new.status := old.status; new.founding := old.founding; new.commission_rate := old.commission_rate;
    new.beat_limit := old.beat_limit; new.review_note := old.review_note; new.reviewed_at := old.reviewed_at;
    new.user_id := old.user_id;
    -- a rejected applicant who edits their application goes back to review
    if old.status = 'rejected' then new.status := 'pending'; end if;
  end if;
  return new;
end $$;
create trigger guard_producer_profile before insert or update on public.producer_profiles
  for each row execute function public.guard_producer_profile();

create or replace function public.guard_beat()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count int; v_limit int;
begin
  new.updated_at := now();
  if public.is_admin() then
    if new.status = 'approved' and new.published_at is null then new.published_at := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.producer_profiles where user_id = new.producer_id and status = 'approved') then
      raise exception 'Only approved producers can upload beats';
    end if;
    select count(*) into v_count from public.beats where producer_id = new.producer_id and status not in ('removed', 'rejected');
    select beat_limit into v_limit from public.producer_profiles where user_id = new.producer_id;
    if v_count >= v_limit then
      raise exception 'Upload limit reached (% beats on the free plan)', v_limit;
    end if;
    new.status := 'pending'; new.review_note := null; new.plays := 0; new.published_at := null;
  else
    new.producer_id := old.producer_id; new.plays := old.plays; new.published_at := old.published_at;
    new.review_note := old.review_note;
    -- producers may only take a beat down ("removed") themselves; anything else needs review
    if new.status = 'removed' and old.status <> 'sold_exclusive' then
      null;
    elsif old.status = 'sold_exclusive' then
      new := old;  -- sold exclusives are frozen
    elsif old.status in ('approved', 'rejected', 'removed') then
      new.status := 'pending';  -- any edit or relist goes back to the review queue
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;
create trigger guard_beat before insert or update on public.beats
  for each row execute function public.guard_beat();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.producer_profiles enable row level security;
alter table public.producer_private enable row level security;
alter table public.beats enable row level security;
alter table public.beat_licences enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wallet_entries enable row level security;
alter table public.payouts enable row level security;
alter table public.reports enable row level security;
alter table public.site_settings enable row level security;

-- profiles
create policy "profiles: self or admin read" on public.profiles for select
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: self update" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin update" on public.profiles for update
  using ((select public.is_admin()));
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

-- producer_profiles: approved ones are public; owner sees own; admin all
create policy "producers: public read approved" on public.producer_profiles for select
  using (status = 'approved' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "producers: apply" on public.producer_profiles for insert
  with check (user_id = (select auth.uid()));
create policy "producers: self update" on public.producer_profiles for update
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "producer_private: owner or admin" on public.producer_private for select
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "producer_private: owner insert" on public.producer_private for insert
  with check (user_id = (select auth.uid()));
create policy "producer_private: owner update" on public.producer_private for update
  using (user_id = (select auth.uid()));

-- beats
create policy "beats: public read live" on public.beats for select
  using (status in ('approved', 'sold_exclusive') or producer_id = (select auth.uid()) or (select public.is_admin()));
create policy "beats: producer insert" on public.beats for insert
  with check (producer_id = (select auth.uid()));
create policy "beats: producer/admin update" on public.beats for update
  using (producer_id = (select auth.uid()) or (select public.is_admin()));

create policy "licences: read with beat" on public.beat_licences for select
  using (exists (select 1 from public.beats b where b.id = beat_id));
create policy "licences: producer write" on public.beat_licences for all
  using (exists (select 1 from public.beats b where b.id = beat_id and b.producer_id = (select auth.uid()) and b.status <> 'sold_exclusive'))
  with check (exists (select 1 from public.beats b where b.id = beat_id and b.producer_id = (select auth.uid()) and b.status <> 'sold_exclusive'));

-- cart
create policy "cart: own" on public.cart_items for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- orders: buyer reads own, admin all. Writes only through functions.
create policy "orders: buyer or admin read" on public.orders for select
  using (buyer_id = (select auth.uid()) or (select public.is_admin()));
create policy "order_items: buyer, producer or admin read" on public.order_items for select
  using (producer_id = (select auth.uid()) or (select public.is_admin())
         or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid())));

create policy "wallet: producer or admin read" on public.wallet_entries for select
  using (producer_id = (select auth.uid()) or (select public.is_admin()));
create policy "payouts: producer or admin read" on public.payouts for select
  using (producer_id = (select auth.uid()) or (select public.is_admin()));

create policy "reports: anyone can file" on public.reports for insert
  with check (reporter_id is null or reporter_id = (select auth.uid()));
create policy "reports: admin read" on public.reports for select using ((select public.is_admin()));
create policy "reports: admin update" on public.reports for update using ((select public.is_admin()));

create policy "settings: public read" on public.site_settings for select using (true);
create policy "settings: admin update" on public.site_settings for update using ((select public.is_admin()));

-- =====================================================================
-- Business logic (security definer, validated server-side)
-- =====================================================================

-- Checkout: turns the cart into an order with server-computed prices.
create or replace function public.create_order_from_cart(p_buyer_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_total int := 0;
  r record;
  v_fee int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if coalesce(trim(p_buyer_name), '') = '' then raise exception 'Licensee name is required'; end if;
  if not exists (select 1 from public.cart_items where user_id = v_uid) then raise exception 'Cart is empty'; end if;

  insert into public.orders (buyer_id, buyer_name, buyer_email)
  values (v_uid, trim(p_buyer_name), (select email from public.profiles where id = v_uid))
  returning id into v_order;

  for r in
    select c.beat_id, c.licence_type, l.price_pkr, b.title, b.status, b.producer_id,
           p.stage_name, p.commission_rate
    from public.cart_items c
    join public.beats b on b.id = c.beat_id
    join public.beat_licences l on l.beat_id = c.beat_id and l.licence_type = c.licence_type and l.enabled
    join public.producer_profiles p on p.user_id = b.producer_id
    where c.user_id = v_uid and c.licence_type <> 'free'
  loop
    if r.status <> 'approved' then raise exception '"%" is no longer available', r.title; end if;
    if r.producer_id = v_uid then raise exception 'You cannot buy your own beat'; end if;
    v_fee := round(r.price_pkr * r.commission_rate);
    insert into public.order_items (order_id, beat_id, producer_id, beat_title, producer_name, licence_type,
                                    price_pkr, commission_rate, platform_fee_pkr, producer_earning_pkr)
    values (v_order, r.beat_id, r.producer_id, r.title, r.stage_name, r.licence_type,
            r.price_pkr, r.commission_rate, v_fee, r.price_pkr - v_fee);
    v_total := v_total + r.price_pkr;
  end loop;

  if not exists (select 1 from public.order_items where order_id = v_order) then
    raise exception 'Items in your cart are no longer available';
  end if;

  update public.orders set total_pkr = v_total where id = v_order;
  delete from public.cart_items where user_id = v_uid;

  if v_total = 0 then
    perform public._mark_order_paid(v_order);
  end if;
  return v_order;
end $$;

-- Internal: mark paid, credit producer wallets (7-day hold), retire exclusives.
create or replace function public._mark_order_paid(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if (select status from public.orders where id = p_order for update) <> 'pending_payment' then
    raise exception 'Order is not awaiting payment';
  end if;
  for r in select * from public.order_items where order_id = p_order loop
    if r.licence_type = 'exclusive' then
      if (select status from public.beats where id = r.beat_id for update) <> 'approved' then
        raise exception 'Exclusive for "%" was already sold. Refund or cancel this order.', r.beat_title;
      end if;
      update public.beats set status = 'sold_exclusive' where id = r.beat_id;
      delete from public.cart_items where beat_id = r.beat_id;
    end if;
    if r.producer_earning_pkr > 0 then
      insert into public.wallet_entries (producer_id, amount_pkr, kind, order_item_id, available_at)
      values (r.producer_id, r.producer_earning_pkr, 'sale', r.id, now() + interval '7 days');
    end if;
  end loop;
  update public.orders set status = 'paid', paid_at = now() where id = p_order;
end $$;
revoke execute on function public._mark_order_paid(uuid) from public, anon, authenticated;

create or replace function public.submit_payment_reference(p_order uuid, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set payment_reference = left(trim(p_reference), 120)
  where id = p_order and buyer_id = auth.uid() and status = 'pending_payment';
  if not found then raise exception 'Order not found'; end if;
end $$;

create or replace function public.cancel_my_order(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set status = 'cancelled'
  where id = p_order and buyer_id = auth.uid() and status = 'pending_payment';
  if not found then raise exception 'Order not found'; end if;
end $$;

-- Admin actions
create or replace function public.admin_mark_order_paid(p_order uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  perform public._mark_order_paid(p_order);
  update public.orders set admin_note = coalesce(p_note, admin_note) where id = p_order;
end $$;

create or replace function public.admin_cancel_order(p_order uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.orders set status = 'cancelled', admin_note = coalesce(p_note, admin_note)
  where id = p_order and status = 'pending_payment';
  if not found then raise exception 'Only unpaid orders can be cancelled'; end if;
end $$;

create or replace function public.admin_refund_order(p_order uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if (select status from public.orders where id = p_order for update) <> 'paid' then
    raise exception 'Only paid orders can be refunded';
  end if;
  for r in select * from public.order_items where order_id = p_order loop
    if r.producer_earning_pkr > 0 then
      insert into public.wallet_entries (producer_id, amount_pkr, kind, order_item_id, note)
      values (r.producer_id, -r.producer_earning_pkr, 'refund', r.id, 'Refund of order item');
    end if;
    if r.licence_type = 'exclusive' then
      update public.beats set status = 'approved' where id = r.beat_id and status = 'sold_exclusive';
    end if;
  end loop;
  update public.orders set status = 'refunded', admin_note = coalesce(p_note, admin_note) where id = p_order;
end $$;

create or replace function public.admin_review_producer(p_user uuid, p_approve boolean, p_note text default null,
                                                       p_founding boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.producer_profiles
     set status = case when p_approve then 'approved'::public.producer_status else 'rejected'::public.producer_status end,
         review_note = p_note, reviewed_at = now(), founding = p_founding,
         commission_rate = case when p_founding then 0 else commission_rate end
   where user_id = p_user;
  if p_approve then
    update public.profiles set role = 'producer' where id = p_user and role = 'buyer';
  end if;
end $$;

create or replace function public.admin_review_beat(p_beat uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.beats set status = case when p_approve then 'approved'::public.beat_status else 'rejected'::public.beat_status end,
         review_note = p_note
   where id = p_beat and status <> 'sold_exclusive';
end $$;

-- Wallet balances
create or replace function public.wallet_summary(p_producer uuid default null)
returns table (available_pkr int, on_hold_pkr int, paid_out_pkr int, lifetime_pkr int)
language sql stable security definer set search_path = '' as $$
  with pid as (select coalesce(p_producer, auth.uid()) as id)
  select
    coalesce(sum(amount_pkr) filter (where available_at <= now()), 0)::int,
    coalesce(sum(amount_pkr) filter (where available_at > now()), 0)::int,
    coalesce(-sum(amount_pkr) filter (where kind in ('payout', 'payout_reversal')), 0)::int,
    coalesce(sum(amount_pkr) filter (where kind in ('sale', 'refund')), 0)::int
  from public.wallet_entries, pid
  where producer_id = pid.id and (pid.id = auth.uid() or public.is_admin());
$$;

create or replace function public.request_payout(p_amount int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_avail int; v_pay public.producer_private; v_id uuid;
begin
  if p_amount < 2000 then raise exception 'Minimum payout is PKR 2,000'; end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  select available_pkr into v_avail from public.wallet_summary(v_uid);
  if p_amount > v_avail then raise exception 'Amount is more than your available balance (PKR %)', v_avail; end if;
  select * into v_pay from public.producer_private where user_id = v_uid;
  if v_pay.payout_account is null or v_pay.payout_account = '' then raise exception 'Add your payout account first'; end if;
  insert into public.payouts (producer_id, amount_pkr, method, account_title, account)
  values (v_uid, p_amount, v_pay.payout_method, v_pay.payout_account_title, v_pay.payout_account)
  returning id into v_id;
  insert into public.wallet_entries (producer_id, amount_pkr, kind, payout_id, note)
  values (v_uid, -p_amount, 'payout', v_id, 'Payout requested');
  return v_id;
end $$;

create or replace function public.admin_process_payout(p_payout uuid, p_paid boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.payouts;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v from public.payouts where id = p_payout for update;
  if v.status <> 'requested' then raise exception 'Payout already processed'; end if;
  update public.payouts set status = case when p_paid then 'paid'::public.payout_status else 'rejected'::public.payout_status end,
         admin_note = p_note, processed_at = now() where id = p_payout;
  if not p_paid then
    insert into public.wallet_entries (producer_id, amount_pkr, kind, payout_id, note)
    values (v.producer_id, v.amount_pkr, 'payout_reversal', v.id, 'Payout rejected: ' || coalesce(p_note, ''));
  end if;
end $$;

-- Public licence verification (no personal data beyond licensee name)
create or replace function public.verify_licence(p_code text)
returns table (licence_code text, licence_type public.licence_type, beat_title text, producer_name text,
               licensee text, issued_at timestamptz, valid boolean)
language sql stable security definer set search_path = '' as $$
  select oi.licence_code, oi.licence_type, oi.beat_title, oi.producer_name, o.buyer_name, o.paid_at,
         (o.status = 'paid')
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where oi.licence_code = upper(trim(p_code)) and o.status in ('paid', 'refunded');
$$;

create or replace function public.increment_play(p_beat uuid)
returns void language sql security definer set search_path = '' as $$
  update public.beats set plays = plays + 1 where id = p_beat and status in ('approved', 'sold_exclusive');
$$;

-- Duplicate-upload check (hash match against other producers' beats)
create or replace function public.hash_in_use(p_hash text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.beats where file_hash = p_hash and producer_id <> auth.uid());
$$;

create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return json_build_object(
    'users', (select count(*) from public.profiles),
    'producers_approved', (select count(*) from public.producer_profiles where status = 'approved'),
    'producers_pending', (select count(*) from public.producer_profiles where status = 'pending'),
    'beats_live', (select count(*) from public.beats where status = 'approved'),
    'beats_pending', (select count(*) from public.beats where status = 'pending'),
    'orders_pending', (select count(*) from public.orders where status = 'pending_payment'),
    'orders_paid_30d', (select count(*) from public.orders where status = 'paid' and paid_at > now() - interval '30 days' and total_pkr > 0),
    'gmv_30d', (select coalesce(sum(total_pkr), 0) from public.orders where status = 'paid' and paid_at > now() - interval '30 days'),
    'platform_fee_30d', (select coalesce(sum(oi.platform_fee_pkr), 0) from public.order_items oi join public.orders o on o.id = oi.order_id
                          where o.status = 'paid' and o.paid_at > now() - interval '30 days'),
    'payouts_requested', (select coalesce(sum(amount_pkr), 0) from public.payouts where status = 'requested'),
    'reports_open', (select count(*) from public.reports where status = 'open')
  );
end $$;

-- Lock down function execution to signed-in users where it makes sense
revoke execute on function public.create_order_from_cart(text) from anon;
revoke execute on function public.request_payout(int) from anon;
revoke execute on function public.submit_payment_reference(uuid, text) from anon;
revoke execute on function public.cancel_my_order(uuid) from anon;
revoke execute on function public.admin_mark_order_paid(uuid, text) from anon;
revoke execute on function public.admin_cancel_order(uuid, text) from anon;
revoke execute on function public.admin_refund_order(uuid, text) from anon;
revoke execute on function public.admin_review_producer(uuid, boolean, text, boolean) from anon;
revoke execute on function public.admin_review_beat(uuid, boolean, text) from anon;
revoke execute on function public.admin_process_payout(uuid, boolean, text) from anon;
revoke execute on function public.admin_stats() from anon;

-- =====================================================================
-- Storage
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('previews', 'previews', true, 20971520, array['audio/mpeg', 'audio/mp3', 'image/jpeg', 'image/png', 'image/webp']),
  ('masters', 'masters', false, 524288000, array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'application/zip', 'application/x-zip-compressed']);

-- Paths: {producer_id}/{beat_id}/{file}
create policy "previews: producer upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'previews' and (storage.foldername(name))[1] = (select auth.uid())::text
              and exists (select 1 from public.producer_profiles where user_id = (select auth.uid()) and status = 'approved'));
create policy "previews: producer update own" on storage.objects for update to authenticated
  using (bucket_id = 'previews' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "previews: producer delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "masters: producer upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'masters' and (storage.foldername(name))[1] = (select auth.uid())::text
              and exists (select 1 from public.producer_profiles where user_id = (select auth.uid()) and status = 'approved'));
create policy "masters: producer update own" on storage.objects for update to authenticated
  using (bucket_id = 'masters' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "masters: producer delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'masters' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Buyers can read (sign) a master only if a paid order covers that file:
--   basic -> master.mp3; premium -> + master.wav; unlimited/exclusive -> + stems.zip
create or replace function public.can_download_master(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    (storage.foldername(p_name))[1] = auth.uid()::text
    or public.is_admin()
    or exists (
      select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.buyer_id = auth.uid() and o.status = 'paid'
        and oi.beat_id::text = (storage.foldername(p_name))[2]
        and case storage.filename(p_name)
              when 'master.mp3' then oi.licence_type in ('basic', 'premium', 'unlimited', 'exclusive')
              when 'master.wav' then oi.licence_type in ('premium', 'unlimited', 'exclusive')
              when 'stems.zip' then oi.licence_type in ('unlimited', 'exclusive')
              else false end
    );
$$;
create policy "masters: owner, admin or licensed buyer read" on storage.objects for select to authenticated
  using (bucket_id = 'masters' and public.can_download_master(name));

-- Free (non-profit) licence: issued instantly, no cart.
create or replace function public.claim_free_licence(p_beat uuid, p_buyer_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_order uuid; b record;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if coalesce(trim(p_buyer_name), '') = '' then raise exception 'Licensee name is required'; end if;
  select bt.id, bt.title, bt.producer_id, p.stage_name into b
  from public.beats bt
  join public.producer_profiles p on p.user_id = bt.producer_id
  join public.beat_licences l on l.beat_id = bt.id and l.licence_type = 'free' and l.enabled
  where bt.id = p_beat and bt.status = 'approved';
  if b.id is null then raise exception 'Free licence is not offered for this beat'; end if;
  insert into public.orders (buyer_id, buyer_name, buyer_email, total_pkr, payment_method, status, paid_at)
  values (v_uid, trim(p_buyer_name), (select email from public.profiles where id = v_uid), 0, 'free', 'paid', now())
  returning id into v_order;
  insert into public.order_items (order_id, beat_id, producer_id, beat_title, producer_name, licence_type,
                                  price_pkr, commission_rate, platform_fee_pkr, producer_earning_pkr)
  values (v_order, b.id, b.producer_id, b.title, b.stage_name, 'free', 0, 0, 0, 0);
  return v_order;
end $$;
revoke execute on function public.claim_free_licence(uuid, text) from anon;
