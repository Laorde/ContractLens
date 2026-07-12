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
function resolvePlan(priceId?: string | null) {
  const map: Record<string, { plan: string; billing_cycle: string | null }> = {
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '']: { plan: 'premium', billing_cycle: 'monthly' },
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '']: { plan: 'premium', billing_cycle: 'annual' },
    [process.env.STRIPE_PRICE_PRO_MONTHLY || '']: { plan: 'pro', billing_cycle: 'monthly' },
    [process.env.STRIPE_PRICE_PRO_ANNUAL || '']: { plan: 'pro', billing_cycle: 'annual' }
  }
  return priceId && map[priceId] ? map[priceId] : { plan: 'free', billing_cycle: null }
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (!userId) break

        // One-time resume credit purchase
        if (session.mode === 'payment' && session.metadata?.type === 'resume_credits') {
          const creditsToAdd = parseInt(session.metadata?.credits_to_add || '5', 10)
          const { data: profile } = await supabase.from('profiles').select('resume_credits').eq('id', userId).single()
          const current = profile?.resume_credits || 0
          await supabase.from('profiles').update({ resume_credits: current + creditsToAdd }).eq('id', userId)
          break
        }

        // Subscription checkout
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceId = subscription.items.data[0]?.price?.id
          const { plan, billing_cycle } = resolvePlan(priceId)
          await supabase.from('profiles').update({ plan, billing_cycle, stripe_subscription_id: subscription.id, stripe_price_id: priceId, subscription_status: subscription.status, scans_used: 0, scans_reset_at: new Date().toISOString() }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        if (!userId) break
        const priceId = subscription.items.data[0]?.price?.id
        const { plan, billing_cycle } = resolvePlan(priceId)
        await supabase.from('profiles').update({ plan, billing_cycle, stripe_subscription_id: subscription.id, stripe_price_id: priceId, subscription_status: subscription.status, scans_used: 0, scans_reset_at: new Date().toISOString() }).eq('id', userId)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        if (!userId) break
        const priceId = subscription.items.data[0]?.price?.id
        const { plan, billing_cycle } = resolvePlan(priceId)
        await supabase.from('profiles').update({ plan, billing_cycle, stripe_price_id: priceId, subscription_status: subscription.status }).eq('id', userId)
        break
      }
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj: any = event.data.object
        const subId = obj.subscription || obj.id
        const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_subscription_id', subId).single()
        if (profile) await supabase.from('profiles').update({ plan: 'free', billing_cycle: null, stripe_subscription_id: null, stripe_price_id: null, subscription_status: event.type === 'invoice.payment_failed' ? 'past_due' : 'canceled', scans_used: 0, scans_reset_at: new Date().toISOString() }).eq('id', profile.id)
        break
      }
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
