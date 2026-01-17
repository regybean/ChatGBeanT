import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { MessageSquare, Zap, Shield, Users } from 'lucide-react';

import { Button } from '@chatgbeant/ui/button';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/c/new');
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            ChatGBeanT
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Pricing
            </Link>
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Chat with Multiple AI Models
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          Access Claude, GPT-4, Gemini, and more through a single interface.
          Choose the best model for your needs with our tier-based access
          system.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/sign-up">Start Chatting Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Why ChatGBeanT?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={MessageSquare}
              title="Multiple Models"
              description="Access Claude, GPT-4, Gemini, DeepSeek, and more through OpenRouter."
            />
            <FeatureCard
              icon={Zap}
              title="Fast Responses"
              description="Streaming responses for a smooth, real-time chat experience."
            />
            <FeatureCard
              icon={Shield}
              title="Secure & Private"
              description="Your conversations are private and protected with enterprise security."
            />
            <FeatureCard
              icon={Users}
              title="Tier-Based Access"
              description="Choose between Basic and Pro tiers based on your needs."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ChatGBeanT. All rights reserved.
            </p>
            <nav className="flex gap-4">
              <Link
                href="/terms-of-service"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Terms
              </Link>
              <Link
                href="/privacy-policy"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof MessageSquare;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <Icon className="mb-4 h-8 w-8 text-primary" />
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
