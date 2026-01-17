import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            ChatGBeanT
          </Link>
        </div>
      </header>

      <article className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>

        <div className="prose prose-gray dark:prose-invert">
          <p className="text-muted-foreground">Last updated: January 2026</p>

          <h2 className="mt-8 text-2xl font-semibold">1. Acceptance of Terms</h2>
          <p>
            By accessing and using ChatGBeanT, you accept and agree to be bound
            by these Terms of Service. If you do not agree to these terms,
            please do not use our service.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">2. Description of Service</h2>
          <p>
            ChatGBeanT provides access to multiple AI language models through a
            unified chat interface. We use OpenRouter to connect you to various
            AI providers including Anthropic, OpenAI, Google, and others.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the security of your account and
            all activities that occur under your account. You must provide
            accurate information when creating an account.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">4. Acceptable Use</h2>
          <p>You agree not to use ChatGBeanT to:</p>
          <ul className="list-disc pl-6">
            <li>Generate harmful, illegal, or offensive content</li>
            <li>Violate any laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Abuse or circumvent usage limits</li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">5. Token Usage and Limits</h2>
          <p>
            Your usage is subject to the token limits of your subscription tier.
            Unused tokens do not roll over to the next billing period.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">6. Limitation of Liability</h2>
          <p>
            ChatGBeanT is provided &quot;as is&quot; without warranties of any
            kind. We are not liable for any damages arising from your use of the
            service.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">7. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued
            use of the service after changes constitutes acceptance of the new
            terms.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">8. Contact</h2>
          <p>
            For questions about these terms, please contact us at
            support@chatgbeant.com.
          </p>
        </div>
      </article>
    </main>
  );
}
