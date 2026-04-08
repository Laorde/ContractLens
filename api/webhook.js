const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function resolvePlan(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY]: { plan: "premium", billing_cycle: "monthly" },
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL]:  { plan: "premium", billing_cycle: "annual" },
    [process.env.STRIPE_PRICE_PRO_MONTHLY]:     { plan: "pro",     billing_cycle: "monthly" },
    [process.env.STRIPE_PRICE_PRO_ANNUAL]:      { plan: "pro",     billing_cycle: "annual" },
  };
  return map[priceId] || { plan: "free", billing_cycle: null };
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(Buffer.from(data)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"];
  let event;
  try {
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

      case "customer.subscription.created":
      case "checkout.session.completed": {
        let subscription, userId;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          if (session.mode !== "subscription") break;
          subscription = await stripe.subscriptions.retrieve(session.subscription);
          userId = (session.metadata && session.metadata.supabase_user_id)
                || (subscription.metadata && subscription.metadata.supabase_user_id);
        } else {
          subscription = event.data.object;
          userId = subscription.metadata && subscription.metadata.supabase_user_id;
        }

        if (!userId) {
          console.warn("No supabase_user_id in metadata — skipping");
          break;
        }

        const priceId = subscription.items.data[0] && subscription.items.data[0].price && subscription.items.data[0].price.id;
        const { plan, billing_cycle } = resolvePlan(priceId);

        await supabase.from("profiles").update({
          plan,
          billing_cycle,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          subscription_status: subscription.status,
          scans_used: 0,
          scans_reset_at: new Date().toISOString(),
        }).eq("id", userId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata && subscription.metadata.supabase_user_id;
        if (!userId) break;

        const priceId = subscription.items.data[0] && subscription.items.data[0].price && subscription.items.data[0].price.id;
        const { plan, billing_cycle } = resolvePlan(priceId);

        await supabase.from("profiles").update({
          plan,
          billing_cycle,
          stripe_price_id: priceId,
          subscription_status: subscription.status,
        }).eq("id", userId);

        break;
      }

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
        break;
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

// Disable body parsing so we can read raw body for Stripe signature verification
module.exports.config = {
  api: { bodyParser: false },
};
