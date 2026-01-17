import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
        <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>

        <div className="prose prose-gray dark:prose-invert">
          <p className="text-muted-foreground">Last updated: January 2026</p>

          <h2 className="mt-8 text-2xl font-semibold">1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="list-disc pl-6">
            <li>
              Account information (email, name) through our authentication
              provider Clerk
            </li>
            <li>Chat messages and conversation history</li>
            <li>Usage data (token consumption, model usage)</li>
            <li>Technical information (IP address, browser type)</li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6">
            <li>Provide and improve our services</li>
            <li>Process your requests and send AI responses</li>
            <li>Monitor usage and enforce limits</li>
            <li>Communicate with you about your account</li>
            <li>Ensure the security of our platform</li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">3. Data Storage</h2>
          <p>
            Your data is stored securely using Convex, a modern backend
            platform. Chat messages are stored to provide conversation history.
            You can delete your chats at any time.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Clerk</strong> - Authentication and user management
            </li>
            <li>
              <strong>Convex</strong> - Database and backend services
            </li>
            <li>
              <strong>OpenRouter</strong> - AI model API access
            </li>
          </ul>
          <p>
            Your messages are sent to AI providers through OpenRouter. Please
            review their privacy policies as well.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. You can
            request deletion of your account and associated data at any time.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data</li>
            <li>Export your data</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">7. Security</h2>
          <p>
            We implement industry-standard security measures to protect your
            data, including encryption in transit and at rest.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">8. Contact</h2>
          <p>
            For privacy-related questions, please contact us at
            privacy@chatgbeant.com.
          </p>
        </div>
      </article>
    </main>
  );
}
