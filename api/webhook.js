import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Maps Stripe price IDs → internal plan labels
// Populated from env vars — same keys as create-checkout.js
function resolvePlan(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY]: { plan: "premium", billing_cycle: "monthly" },
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL]:  { plan: "premium", billing_cycle: "annual" },
    [process.env.STRIPE_PRICE_PRO_MONTHLY]:     { plan: "pro",     billing_cycle: "monthly" },
    [process.env.STRIPE_PRICE_PRO_ANNUAL]:      { plan: "pro",     billing_cycle: "annual" },
  };
  return map[priceId] || { plan: "free", billing_cycle: null };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // ── Verify Stripe signature ──
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    // Vercel doesn't parse raw body automatically — need rawBody
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {

      // ── New subscription created (after checkout) ──
      case "customer.subscription.created":
      case "checkout.session.completed": {
        let subscription, userId;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          if (session.mode !== "subscription") break;
          subscription = await stripe.subscriptions.retrieve(session.subscription);
          userId = session.metadata?.supabase_user_id
                || subscription.metadata?.supabase_user_id;
        } else {
          subscription = event.data.object;
          userId = subscription.metadata?.supabase_user_id;
        }

        if (!userId) {
          console.warn("No supabase_user_id in subscription metadata — skipping");
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const { plan, billing_cycle } = resolvePlan(priceId);

        await supabase.from("profiles").update({
          plan,
          billing_cycle,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          subscription_status: subscription.status,
          // Reset scan counter when upgrading
          scans_used: 0,
          scans_reset_at: new Date().toISOString(),
        }).eq("id", userId);

        break;
      }

      // ── Subscription updated (plan change, renewal) ──
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;

        const priceId = subscription.items.data[0]?.price?.id;
        const { plan, billing_cycle } = resolvePlan(priceId);

        await supabase.from("profiles").update({
          plan,
          billing_cycle,
          stripe_price_id: priceId,
          subscription_status: subscription.status,
        }).eq("id", userId);

        break;
      }

      // ── Subscription cancelled or payment failed ──
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj = event.data.object;
        const subId = obj.subscription || obj.id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (profile) {
          await supabase.from("profiles").update({
            plan: "free",
            billing_cycle: null,
            stripe_subscription_id: null,
            stripe_price_id: null,
            subscription_status: event.type === "invoice.payment_failed" ? "past_due" : "canceled",
            scans_used: 0,
            scans_reset_at: new Date().toISOString(),
          }).eq("id", profile.id);
        }
        break;
      }

      default:
        // Unhandled event — ignore silently
        break;
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

// ── Raw body helper for Vercel ──
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(Buffer.from(data)));
    req.on("error", reject);
  });
}

// Vercel: disable body parsing so we can read raw body for signature verification
export const config = {
  api: { bodyParser: false },
};
