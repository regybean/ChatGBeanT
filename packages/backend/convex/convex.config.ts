import { defineApp } from 'convex/server';
import agent from '@convex-dev/agent/convex.config';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import prosemirrorSync from '@convex-dev/prosemirror-sync/convex.config';

const app = defineApp();
app.use(agent);
app.use(rateLimiter);
app.use(prosemirrorSync);
export default app;
