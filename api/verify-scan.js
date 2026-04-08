const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_LIMITS = {
  free:    2,
  premium: 30,
  pro:     100,
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_SITE_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid session" });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, billing_cycle, scans_used, scans_reset_at, subscription_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: "Could not retrieve user profile" });
  }

  const resetAt = new Date(profile.scans_reset_at);
  const now = new Date();
  const monthsSinceReset =
    (now.getFullYear() - resetAt.getFullYear()) * 12 +
    (now.getMonth() - resetAt.getMonth());

  let scansUsed = profile.scans_used;
  if (monthsSinceReset >= 1) {
    scansUsed = 0;
    await supabase
      .from("profiles")
      .update({ scans_used: 0, scans_reset_at: now.toISOString() })
      .eq("id", user.id);
  }

  if (profile.plan !== "free" && profile.subscription_status === "past_due") {
    return res.status(402).json({
      error: "payment_required",
      message: "Your subscription payment failed. Please update your payment method.",
    });
  }

  const limit = PLAN_LIMITS[profile.plan] || PLAN_LIMITS.free;

  if (scansUsed >= limit) {
    return res.status(429).json({
      error: "scan_limit_reached",
      plan: profile.plan,
      limit,
      scans_used: scansUsed,
      message:
        profile.plan === "free"
          ? `You've used your ${limit} free scans this month. Upgrade to continue.`
          : `You've used all ${limit} scans on your ${profile.plan} plan this month.`,
    });
  }

  await supabase
    .from("profiles")
    .update({ scans_used: scansUsed + 1 })
    .eq("id", user.id);

  const remaining = limit - (scansUsed + 1);

  return res.status(200).json({
    allowed: true,
    plan: profile.plan,
    billing_cycle: profile.billing_cycle,
    scans_used: scansUsed + 1,
    scans_limit: limit,
    scans_remaining: remaining,
  });
};
