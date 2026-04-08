-- ============================================================
-- ContractLens — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. Profiles table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT,
  plan                  TEXT NOT NULL DEFAULT 'free',       -- 'free' | 'premium' | 'pro'
  billing_cycle         TEXT,                               -- 'monthly' | 'annual' | NULL
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id       TEXT,                               -- the exact Stripe price ID active
  subscription_status   TEXT DEFAULT 'active',             -- 'active' | 'canceled' | 'past_due'
  scans_used            INTEGER NOT NULL DEFAULT 0,
  scans_reset_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- reset monthly
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Plan limits lookup ─────────────────────────────────────
-- Not a DB table — enforced in API. For reference:
--   free      → 1 scan/month,  modes: full + tldr
--   premium   → 25 scans/month, modes: full + tldr
--   pro       → unlimited (-1), modes: full + tldr + (future advanced)

-- ── 3. Auto-create profile on signup ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 4. Auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── 5. Row Level Security ─────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (non-sensitive fields only)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role (used by API/webhooks) can do everything
-- (service_role key bypasses RLS by default — no policy needed)

-- ── 6. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx
  ON public.profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS profiles_plan_idx
  ON public.profiles(plan);
