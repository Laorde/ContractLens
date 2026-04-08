const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Plan scan limits (must match verify-scan.js and scan.html)
const PLAN_LIMITS = { free: 2, premium: 30, pro: 100 };

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_SITE_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── 1. Verify JWT ──────────────────────────────────────────
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) {
    return res.status(401).json({ error: "auth_required", message: "Please sign in to analyze contracts." });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "invalid_session", message: "Your session expired. Please sign in again." });
  }

  // ── 2. Fetch profile + check scan quota ───────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, billing_cycle, scans_used, scans_reset_at, subscription_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: "profile_error", message: "Could not load your account." });
  }

  // Reset monthly counter if needed
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

  const limit = PLAN_LIMITS[profile.plan] ?? PLAN_LIMITS.free;

  if (profile.subscription_status === "past_due") {
    return res.status(402).json({
      error: "payment_required",
      message: "Your payment failed. Please update your billing details.",
    });
  }

  if (scansUsed >= limit) {
    return res.status(429).json({
      error: "scan_limit_reached",
      plan: profile.plan,
      limit,
      scans_used: scansUsed,
      message:
        profile.plan === "free"
          ? `You've used your ${limit} free scans this month. Upgrade to keep analyzing.`
          : `You've reached your ${limit} scan limit for the month.`,
    });
  }

  // ── 3. Run the Claude analysis ─────────────────────────────
  try {
    const { messages, system, mode } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: system || "",
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();

    // ── 4. Increment scan counter only on success ──────────
    await supabase
      .from("profiles")
      .update({ scans_used: scansUsed + 1 })
      .eq("id", user.id);

    const remaining = limit - (scansUsed + 1);

    return res.status(200).json({
      ...data,
      _usage: {
        plan: profile.plan,
        scans_used: scansUsed + 1,
        scans_limit: limit,
        scans_remaining: remaining,
      },
    });

  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
