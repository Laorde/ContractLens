import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role — bypasses RLS
);

// Map price IDs — set these after creating products in Stripe dashboard
const PRICE_IDS = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,  // $9.99/mo
  premium_annual:  process.env.STRIPE_PRICE_PREMIUM_ANNUAL,   // $79.99/yr
  pro_monthly:     process.env.STRIPE_PRICE_PRO_MONTHLY,      // $19.99/mo
  pro_annual:      process.env.STRIPE_PRICE_PRO_ANNUAL,       // $159.99/yr
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_SITE_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // ── Auth: verify Supabase JWT ──
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Invalid session" });

    // ── Validate plan selection ──
    const { plan } = req.body; // e.g. "premium_monthly"
    const priceId = PRICE_IDS[plan];
    if (!priceId) return res.status(400).json({ error: "Invalid plan selected" });

    // ── Get or create Stripe customer ──
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // ── Create Checkout session ──
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/scan?upgraded=1`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_key: plan,
        },
      },
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("create-checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
