import { RateLimiter, MINUTE } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Burst protection: 10 messages per minute per user
  sendMessage: {
    kind: 'token bucket',
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
});
