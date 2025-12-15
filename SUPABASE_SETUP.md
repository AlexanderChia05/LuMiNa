

# Supabase Setup Guide for Lumina Salon

To connect this application to Supabase and enable Authentication with the requested Schema, follow these steps.

## 1. Create a Project
Go to [Supabase](https://supabase.com), create a new project.

## 2. SQL Schema (Run this in SQL Editor)

Copy and run the following script in the Supabase SQL Editor. 

```sql
-- --- RESET SCRIPT (DROPS EXISTING TABLES TO PREVENT ERRORS) ---
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop function with CASCADE to remove dependent triggers (trigger_cleanup_notifications)
drop function if exists public.cleanup_notifications() cascade;
drop function if exists public.process_refund(uuid);
-- Drop old refund signatures to prevent conflicts
drop function if exists public.admin_process_refund(uuid, integer, text);
drop function if exists public.admin_process_refund(uuid, integer);
drop function if exists public.manual_refund_transaction(uuid, integer);
drop function if exists public.admin_execute_refund(uuid, integer);
drop function if exists public.client_auto_cancel(uuid);
drop function if exists public.execute_admin_refund_v2(uuid, integer);
drop function if exists public.execute_auto_refund_v2(uuid);

drop table if exists public.promotions cascade;
drop table if exists public.point_history cascade;
drop table if exists public.notification cascade;
drop table if exists public.user_cards cascade;
drop table if exists public.review cascade;
drop table if exists public.orderdiscount cascade;
drop table if exists public.user_rewards cascade;
drop table if exists public.order_table cascade;
drop table if exists public.appointmentservice cascade;
drop table if exists public.appointment cascade;
drop table if exists public.customer cascade;
drop table if exists public.staff cascade;
drop table if exists public.staff_rank cascade;
drop table if exists public.service cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enable PGCrypto for password hashing (Required for Demo User Seed)
create extension if not exists "pgcrypto";

-- Set Timezone to Singapore
alter database postgres set timezone to 'Asia/Singapore';

-- --- NORMALIZED TABLES BASED ON TYPES.TS ---

-- 1. SERVICE
create table public.service (
  service_id uuid default uuid_generate_v4() primary key,
  service_name text not null,
  duration integer not null, -- Minutes
  price integer not null, -- Stored in Cents
  category text default 'General', 
  description text,
  image_url text
);

-- 2. STAFF_RANK (Normalized from Staff Types)
create table public.staff_rank (
  rank_name text primary key,
  surcharge integer default 0,
  commission_rate numeric(4,2) default 0.0
);

-- Seed Ranks
insert into public.staff_rank (rank_name, surcharge, commission_rate) values 
('Senior Director Stylist', 5000, 15.0),
('Director Stylist', 3000, 12.0),
('Senior Stylist', 0, 10.0);

-- 3. STAFF
create table public.staff (
  staff_id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text unique, -- Linked to Auth Email
  phone text,
  rank text references public.staff_rank(rank_name),
  specialties text[], 
  avatar_url text,
  rating numeric(3,2) default 5.0,
  joined_at timestamp default now()
);

-- 4. CUSTOMER
create table public.customer (
  customer_id uuid default uuid_generate_v4() primary key,
  name text,
  phone text,
  email text,
  user_id uuid references auth.users(id),
  total_points integer default 0,
  lifetime_points integer default 0,
  theme_preference text default 'light',
  tng_pin text -- Encrypted or plain 6 digit pin for TNG simulation
);

-- 5. APPOINTMENT
create table public.appointment (
  appointment_id uuid default uuid_generate_v4() primary key,
  ref_id text, -- Added for short 5-char reference (A1234)
  customer_id uuid references public.customer(customer_id),
  staff_id uuid references public.staff(staff_id),
  date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'pending',
  reschedule_count integer default 0,
  created_at timestamp with time zone default now()
);

-- 6. APPOINTMENTSERVICE (Junction Table)
create table public.appointmentservice (
  appointment_id uuid references public.appointment(appointment_id),
  service_id uuid references public.service(service_id),
  quantity integer default 1,
  service_price integer,
  primary key (appointment_id, service_id)
);

-- 7. ORDER_TABLE (Updated with Detailed Billing & Refund Cents)
create table public.order_table (
  order_id uuid default uuid_generate_v4() primary key,
  appointment_id uuid references public.appointment(appointment_id),
  payment_method text,
  transaction_ref text, -- New Column for HitPay Reference
  sst_cents integer default 0,
  rounding_cents integer default 0,
  surcharge_cents integer default 0,
  total_payable_cents integer default 0,
  status text default 'paid', -- paid, refunded
  refund_cents integer default 0, -- Track partial/full refund amount
  refunded_at timestamp,
  created_at timestamp default now()
);

-- 8. USER_REWARDS (Vouchers)
create table public.user_rewards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text,
  description text,
  discount_cents integer,
  discount_type text default 'fixed',
  serial_number text,
  expiry_date timestamp,
  used boolean default false
);

-- 9. ORDERDISCOUNT
create table public.orderdiscount (
  order_id uuid references public.order_table(order_id),
  discount_type text,
  discount_value integer,
  voucher_id uuid references public.user_rewards(id),
  primary key (order_id, voucher_id)
);

-- 10. REVIEW
create table public.review (
  review_id uuid default uuid_generate_v4() primary key,
  appointment_id uuid references public.appointment(appointment_id),
  rating integer,
  comment text,
  reply text, -- Added for admin replies
  compensation text, -- Added for admin compensation voucher tracking
  created_at timestamp default now()
);

-- 11. USER_CARDS (Credit Cards)
create table public.user_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  last4 text not null,
  brand text not null,
  expiry text not null,
  holder_name text not null,
  created_at timestamp default now()
);

-- 12. NOTIFICATION (Alerts)
create table public.notification (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  message text not null,
  type text check (type in ('info', 'receipt', 'promo', 'reminder', 'review', 'system', 'booking')),
  read boolean default false,
  data jsonb,
  created_at timestamp default now()
);

-- 13. POINT_HISTORY
create table public.point_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  title text,
  points integer,
  type text check (type in ('earn', 'spend')),
  created_at timestamp default now()
);

-- 14. PROMOTIONS (Admin Posts)
create table public.promotions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  image_url text,
  discount_display text, -- e.g. "20% OFF"
  start_date timestamp,
  end_date timestamp,
  active boolean default true,
  applicable_services text[], -- Array of Service IDs for specific offers
  created_at timestamp default now()
);


-- --- FUNCTIONS & TRIGGERS ---

-- Trigger to clean up notifications older than 30 days
create or replace function public.cleanup_notifications()
returns trigger as $$
begin
  delete from public.notification
  where created_at < now() - interval '30 days';
  return new;
end;
$$ language plpgsql;

create trigger trigger_cleanup_notifications
  after insert on public.notification
  execute procedure public.cleanup_notifications();

-- Auth Trigger
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_customer_id uuid;
  role_meta text;
begin
  role_meta := new.raw_user_meta_data->>'role';

  -- Only create customer profile if role is NOT admin or staff
  IF role_meta IS NULL OR role_meta = 'customer' THEN
      -- 1. Create Customer Profile
      insert into public.customer (user_id, email, name, phone, total_points, lifetime_points, theme_preference, tng_pin)
      values (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'name', 
        new.raw_user_meta_data->>'phone',
        0,
        0,
        'light',
        new.raw_user_meta_data->>'pin'
      ) returning customer_id into new_customer_id;

      -- 2. Create Welcome Gift (40% OFF Voucher)
      insert into public.user_rewards (
        user_id, 
        title, 
        description, 
        discount_cents, 
        discount_type,
        serial_number, 
        expiry_date
      )
      values (
        new.id,
        '40% OFF Welcome Gift',
        'Enjoy 40% off your first service!',
        40,
        'percentage',
        'WELCOME-' || substring(new.id::text, 1, 4),
        now() + interval '2 months'
      );
      
      -- 3. Send Welcome Notification
      insert into public.notification (
        user_id, 
        title, 
        message, 
        type, 
        read
      )
      values (
        new.id,
        'Welcome to Lumina!',
        'Thanks for joining us! We have added a 40% OFF voucher to your rewards tab. Book your first appointment today.',
        'promo',
        false
      );
  END IF;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --- RPC: AUTO REFUND V2 ---
create or replace function public.execute_auto_refund_v2(
  appointment_id_input uuid
)
returns table (
  success boolean,
  message text,
  refund_percent integer
)
language plpgsql
security definer
as $$
declare
  appt_record record;
  ord_record record;
  cust_record record;
  refund_pct integer := 0;
  refund_amt integer := 0;
  points_to_deduct integer := 0;
  days_diff integer;
begin
  -- 1. Get Appointment
  select * into appt_record from public.appointment where appointment_id = appointment_id_input;
  if not found then
    return query select false, 'Appointment not found'::text, 0;
    return;
  end if;

  if appt_record.status = 'cancelled' then
      return query select false, 'Already cancelled'::text, 0;
      return;
  end if;

  -- 2. Check 3-Day Rule
  days_diff := (appt_record.date - CURRENT_DATE);
  
  if days_diff >= 3 then
     refund_pct := 80;
  else
     refund_pct := 0;
  end if;

  -- 3. Update Order if Exists
  select * into ord_record from public.order_table where appointment_id = appointment_id_input;
  
  if found then
      refund_amt := floor(ord_record.total_payable_cents * (refund_pct::numeric / 100.0));
      points_to_deduct := floor(refund_amt / 100);
      
      update public.order_table
      set status = 'refunded',
          refund_cents = refund_amt,
          refunded_at = now()
      where order_id = ord_record.order_id;
  end if;

  -- 4. Update Appointment
  update public.appointment
  set status = 'cancelled'
  where appointment_id = appointment_id_input;

  -- 5. Deduct Points (Proportional to Refund)
  if points_to_deduct > 0 then
      select * into cust_record from public.customer where customer_id = appt_record.customer_id;
      if found then
          update public.customer
          set total_points = GREATEST(0, total_points - points_to_deduct),
              lifetime_points = GREATEST(0, lifetime_points - points_to_deduct)
          where customer_id = appt_record.customer_id;
          
          insert into public.point_history (user_id, title, points, type)
          values (cust_record.user_id, 'Cancellation Refund (' || refund_pct || '%)', points_to_deduct, 'spend');
      end if;
  end if;

  return query select true, ('Appointment cancelled. Refund: ' || refund_pct || '%')::text, refund_pct;
end;
$$;


-- --- SEED DATA ---

-- Services
INSERT INTO public.service (service_name, duration, price, category, image_url, description) VALUES
('Wash & Blowdry', 45, 4500, 'Hair', 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=400', 'Refreshing wash followed by a professional blowout.'),
('Wash & Cut', 60, 7500, 'Hair', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=400', 'Includes consultation, wash, massage, and precision cut.'),
('Colour / Semi-colour', 120, 18000, 'Color', 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&q=80&w=400', 'Full head colour or semi-permanent gloss.'),
('Colour Regrowth', 90, 14000, 'Color', 'https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&q=80&w=400', 'Root touch-up to cover regrowth.'),
('Cut & Highlights', 180, 28000, 'Package', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=400', 'Full style transformation with highlights.'),
('Treatments', 30, 12000, 'Care', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=400', 'Deep conditioning and scalp treatments.');

-- Staff (With Emails linked to credentials)
INSERT INTO public.staff (name, email, rank, specialties, avatar_url, rating) VALUES
('Sarah Jenkins', 's0001@lumina.com', 'Senior Director Stylist', ARRAY['Hair', 'Color'], 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', 5.0),
('Michael Chen', 's0002@lumina.com', 'Director Stylist', ARRAY['Skin', 'Massage'], 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 4.8),
('Jessica Alva', 's0003@lumina.com', 'Senior Stylist', ARRAY['Nails', 'Hair'], 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', 4.6);

-- Promotions (Seed)
INSERT INTO public.promotions (title, description, image_url, discount_display, start_date, end_date, applicable_services) VALUES
('Summer Glow Package', 'Full body scrub & facial treatment for a radiant summer look.', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=600', '20% OFF', now(), now() + interval '30 days', ARRAY[]::text[]),
('Bring a Friend', 'Book together and receive RM50 store credit for your next visit.', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=600', 'RM50 Credit', now(), now() + interval '30 days', ARRAY[]::text[]);

-- --- STAFF SEED ---
DO $$
DECLARE
  s1_uid uuid := '00000000-0000-0000-0000-000000000002';
  s2_uid uuid := '00000000-0000-0000-0000-000000000003';
  s3_uid uuid := '00000000-0000-0000-0000-000000000004';
  
BEGIN

  -- 1. Create Staff Users in auth.users
  -- Sarah
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 's0001@lumina.com') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (s1_uid, 'authenticated', 'authenticated', 's0001@lumina.com', crypt('s0001Lumina', gen_salt('bf')), now(), '{"name": "Sarah Jenkins", "role": "staff"}');
  END IF;
  -- Michael
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 's0002@lumina.com') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (s2_uid, 'authenticated', 'authenticated', 's0002@lumina.com', crypt('s0002Lumina', gen_salt('bf')), now(), '{"name": "Michael Chen", "role": "staff"}');
  END IF;
  -- Jessica
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 's0003@lumina.com') THEN
    INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (s3_uid, 'authenticated', 'authenticated', 's0003@lumina.com', crypt('s0003Lumina', gen_salt('bf')), now(), '{"name": "Jessica Alva", "role": "staff"}');
  END IF;

END $$;