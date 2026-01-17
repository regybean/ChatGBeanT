export { authEnv } from './env';

/**
 * Custom JWT session claims from Clerk
 * Extend this type to include additional metadata
 */
export interface CustomJwtSessionClaims {
  metadata: {
    role?: 'user' | 'admin';
    tier?: 'basic' | 'pro';
  };
}

/**
 * User tier types
 */
export type UserTier = 'basic' | 'pro';

/**
 * User role types
 */
export type UserRole = 'user' | 'admin';

/**
 * Token limits by tier
 */
export const TOKEN_LIMITS = {
  basic: {
    basicTokens: 100,
    premiumTokens: 0,
  },
  pro: {
    basicTokens: 1000,
    premiumTokens: 100,
  },
} as const;

/**
 * Check if a user has access to premium models
 */
export function hasPremiumAccess(tier: UserTier): boolean {
  return tier === 'pro';
}

/**
 * Get token limit for a tier
 */
export function getTokenLimits(tier: UserTier) {
  return TOKEN_LIMITS[tier];
}
