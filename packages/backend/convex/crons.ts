import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'sync-openrouter-models',
  { hours: 6 },
  internal.openrouter.internalSyncModels,
);

crons.interval(
  'sync-fal-models',
  { hours: 6 },
  internal.falModels.internalSyncFalModels,
);

export default crons;
