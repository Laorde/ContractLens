import { LegalPage } from '@/components/LegalPage'

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="April 2026">
      <div className="rounded-xl border border-line bg-panel p-6 text-muted">These terms are written in plain English. ContractLens is not a law firm and does not provide legal advice.</div>
      <h2>1. What ContractLens Is</h2><p>ContractLens is an AI-powered contract analysis tool. You upload or paste a contract and we provide a plain-English summary, red flag detection, and general analysis.</p>
      <h2>2. Eligibility</h2><p>You must be at least 18 years old to use ContractLens.</p>
      <h2>3. Your Account</h2><p>You are responsible for keeping your login credentials secure and for all activity under your account.</p>
      <h2>4. Acceptable Use</h2><p>You agree not to upload content you cannot share, reverse engineer the service, use it unlawfully, or circumvent usage limits.</p>
      <h2>5. Subscriptions and Payments</h2><p>Paid plans renew automatically unless cancelled. Payments are processed by Stripe and we do not store payment card details.</p>
      <h2>6. Free Tier</h2><p>The free tier provides 2 contract scans per month.</p>
      <h2>7. Your Content</h2><p>You retain ownership of documents you upload. We process them only to provide the requested analysis.</p>
      <h2>8. Limitation of Liability</h2><p>To the maximum extent permitted by law, ContractLens is not liable for reliance on analysis provided by the tool.</p>
      <h2>9. Contact</h2><p>Questions? Contact hello@contractlens.app.</p>
    </LegalPage>
  )
}
