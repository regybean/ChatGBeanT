import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Submit an image generation request to FalAI (synchronous endpoint).
 * Image generation is fast enough to use fal.run directly.
 */
export const submitImageGeneration = internalAction({
  args: {
    mediaId: v.id('generatedMedia'),
    threadId: v.string(),
    model: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'failed',
        errorMessage: 'FAL_KEY not configured',
      });
      return;
    }

    try {
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'generating',
      });

      // Use synchronous fal.run endpoint — image gen is typically fast (2-10s)
      const response = await fetch(`https://fal.run/${args.model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${falKey}`,
        },
        body: JSON.stringify({
          prompt: args.prompt,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`FalAI request failed (${response.status}): ${errText}`);
      }

      const result = await response.json() as {
        images?: Array<{ url: string }>;
        image?: { url: string };
        output?: string;
      };

      const imageUrl = result.images?.[0]?.url ?? result.image?.url;

      if (imageUrl) {
        // Download and store in Convex storage
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          throw new Error('Failed to download generated image');
        }
        const blob = await imgResponse.blob();
        const storageId = await ctx.storage.store(blob);
        const publicUrl = await ctx.storage.getUrl(storageId);

        await ctx.runMutation(internal.media.updateMediaStatus, {
          mediaId: args.mediaId,
          status: 'completed',
          url: publicUrl ?? imageUrl,
          storageId: storageId as never,
        });
      } else {
        throw new Error('No image URL in FalAI response');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Image generation failed';
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'failed',
        errorMessage: errorMsg,
      });
    }
  },
});

/**
 * Submit a video generation request to FalAI (queue endpoint).
 * Videos take longer so we use the queue with polling.
 */
export const submitVideoGeneration = internalAction({
  args: {
    mediaId: v.id('generatedMedia'),
    threadId: v.string(),
    model: v.string(),
    prompt: v.string(),
    duration: v.optional(v.number()),
    aspectRatio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'failed',
        errorMessage: 'FAL_KEY not configured',
      });
      return;
    }

    try {
      // Update status to generating
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'generating',
      });

      // Submit to FalAI queue
      const response = await fetch(`https://queue.fal.run/${args.model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${falKey}`,
        },
        body: JSON.stringify({
          prompt: args.prompt,
          ...(args.duration ? { duration: args.duration } : {}),
          ...(args.aspectRatio ? { aspect_ratio: args.aspectRatio } : {}),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`FalAI submission failed (${response.status}): ${errText}`);
      }

      const result = await response.json() as { request_id?: string; status_url?: string; response_url?: string };
      const requestId = result.request_id;

      if (!requestId) {
        throw new Error('No request_id in FalAI queue response — the model may not support queued requests');
      }

      // Store request ID and any URLs from the response
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'generating',
        falRequestId: requestId,
      });

      // Schedule status check
      await ctx.scheduler.runAfter(5000, internal.fal.checkVideoStatus, {
        mediaId: args.mediaId,
        model: args.model,
        requestId,
        attempts: 0,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Video generation failed';
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'failed',
        errorMessage: errorMsg,
      });
    }
  },
});

/**
 * Check the status of a FalAI video generation request
 */
export const checkVideoStatus = internalAction({
  args: {
    mediaId: v.id('generatedMedia'),
    model: v.string(),
    requestId: v.string(),
    attempts: v.number(),
  },
  handler: async (ctx, args) => {
    const falKey = process.env.FAL_KEY;
    if (!falKey) return;

    const MAX_ATTEMPTS = 120; // 10 minutes max (5s intervals)
    if (args.attempts >= MAX_ATTEMPTS) {
      await ctx.runMutation(internal.media.updateMediaStatus, {
        mediaId: args.mediaId,
        status: 'failed',
        errorMessage: 'Video generation timed out',
      });
      return;
    }

    try {
      // Check status via queue API
      const statusUrl = `https://queue.fal.run/${args.model}/requests/${args.requestId}/status`;
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falKey}`,
        },
      });

      if (!statusResponse.ok) {
        const errBody = await statusResponse.text();
        throw new Error(
          `Status check failed (${statusResponse.status}): ${errBody}`,
        );
      }

      const status = await statusResponse.json() as { status: string };

      if (status.status === 'COMPLETED') {
        // Get the result
        const resultResponse = await fetch(
          `https://queue.fal.run/${args.model}/requests/${args.requestId}`,
          {
            headers: {
              'Authorization': `Key ${falKey}`,
            },
          },
        );

        if (!resultResponse.ok) {
          const errBody = await resultResponse.text();
          throw new Error(`Result fetch failed (${resultResponse.status}): ${errBody}`);
        }

        const result = await resultResponse.json() as {
          video?: { url: string };
          output?: { url: string };
        };

        const videoUrl = result.video?.url ?? result.output?.url;

        if (videoUrl) {
          // Download and store in Convex storage
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            throw new Error('Failed to download video');
          }
          const blob = await videoResponse.blob();
          const storageId = await ctx.storage.store(blob);
          const publicUrl = await ctx.storage.getUrl(storageId);

          await ctx.runMutation(internal.media.updateMediaStatus, {
            mediaId: args.mediaId,
            status: 'completed',
            url: publicUrl ?? videoUrl,
            storageId: storageId as never,
          });
        } else {
          await ctx.runMutation(internal.media.updateMediaStatus, {
            mediaId: args.mediaId,
            status: 'failed',
            errorMessage: 'No video URL in response',
          });
        }
      } else if (status.status === 'FAILED') {
        await ctx.runMutation(internal.media.updateMediaStatus, {
          mediaId: args.mediaId,
          status: 'failed',
          errorMessage: 'Video generation failed on FalAI',
        });
      } else {
        // Still in progress or in queue — reschedule
        await ctx.scheduler.runAfter(5000, internal.fal.checkVideoStatus, {
          mediaId: args.mediaId,
          model: args.model,
          requestId: args.requestId,
          attempts: args.attempts + 1,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Status check failed';
      // Retry on transient errors, with increasing backoff
      if (args.attempts < 5) {
        const backoff = Math.min(10000 * (args.attempts + 1), 30000);
        await ctx.scheduler.runAfter(backoff, internal.fal.checkVideoStatus, {
          mediaId: args.mediaId,
          model: args.model,
          requestId: args.requestId,
          attempts: args.attempts + 1,
        });
      } else {
        await ctx.runMutation(internal.media.updateMediaStatus, {
          mediaId: args.mediaId,
          status: 'failed',
          errorMessage: errorMsg,
        });
      }
    }
  },
});
