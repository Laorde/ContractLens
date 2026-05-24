import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  const portalSession = await stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: `${site}/account` })
  return NextResponse.json({ url: portalSession.url })
}
