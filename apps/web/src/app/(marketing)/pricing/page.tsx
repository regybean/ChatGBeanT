import Link from 'next/link';
import { Check } from 'lucide-react';

import { Button } from '@chatgbeant/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@chatgbeant/ui/card';

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    description: 'Get started with AI chat',
    features: [
      '100 basic model tokens/month',
      'Access to Claude Haiku, GPT-4o Mini',
      'Access to Gemini Flash, DeepSeek',
      'Chat history',
      'Basic support',
    ],
    cta: 'Get Started',
    href: '/sign-up',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$9.99/mo',
    description: 'For power users',
    features: [
      '1,000 basic model tokens/month',
      '100 premium model tokens/month',
      'Access to all Basic models',
      'Access to Claude Sonnet, GPT-4o',
      'Access to Claude Opus, Gemini Pro',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    href: '/sign-up',
    popular: true,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            ChatGBeanT
          </Link>
          <nav className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that works for you
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? 'border-primary shadow-lg' : ''}
            >
              {plan.popular && (
                <div className="rounded-t-lg bg-primary px-4 py-1 text-center text-sm font-medium text-primary-foreground">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                </div>
                <p className="text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
