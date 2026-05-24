import { LegalPage } from '@/components/LegalPage'

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="April 2026">
      <div className="rounded-xl border border-line bg-panel p-6 text-muted">Plain-English privacy summary: we collect account info, process submitted documents for analysis, and use Stripe/Supabase/Anthropic to run the service.</div>
      <h2>1. What We Collect</h2><p>We collect your email address, usage count, subscription status, and document content submitted for analysis.</p>
      <h2>2. What We Do Not Do</h2><p>We do not sell your data, share personal information with advertisers, or use your contract content to train AI models.</p>
      <h2>3. Third-Party Services</h2><p>We use Supabase for auth/database, Stripe for payments, and Anthropic for AI analysis.</p>
      <h2>4. Data Retention</h2><p>Account data is retained while your account is active. Contract content is processed to return analysis and should not be permanently stored unless you later add a saved history feature.</p>
      <h2>5. Security</h2><p>We use HTTPS, secure authentication, environment variables, and server-side API routes for sensitive keys.</p>
      <h2>6. Contact</h2><p>Privacy questions? Contact hello@contractlens.app.</p>
    </LegalPage>
  )
}
