import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const PRICE_IDS: Record<string, string | undefined> = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_annual:  process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
  pro_monthly:     process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:      process.env.STRIPE_PRICE_PRO_ANNUAL,
  // legacy keys kept for compatibility
  premium: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  pro:     process.env.STRIPE_PRICE_PRO_MONTHLY,
}

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '')
    .replace('Bearer ', '')
    .trim()

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const { plan } = await req.json()
  const priceId = PRICE_IDS[plan]

  if (!priceId) {
    return NextResponse.json(
      { error: 'Invalid plan selected' },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    })

    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${site}/scan?upgraded=1`,
    cancel_url: `${site}/#pricing`,
    metadata: {
      supabase_user_id: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    },
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    customer_update: { address: 'auto' },
  })

  return NextResponse.json({ url: checkoutSession.url })
}