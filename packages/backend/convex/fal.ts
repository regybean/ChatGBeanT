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
        imageUrls: v.optional(v.array(v.string())),
        falApiKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const falKey = args.falApiKey ?? process.env.FAL_KEY;
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

            // Build request body — include image URLs for image-to-image models
            // Send both field names since different fal models use different schemas
            const body: Record<string, unknown> = { prompt: args.prompt };
            if (args.imageUrls && args.imageUrls.length > 0) {
                body.image_url = args.imageUrls[0];
                body.image_urls = args.imageUrls;
            }

            console.log(`[fal:image] Generating with model=${args.model}, hasImages=${!!args.imageUrls?.length}, body keys: ${Object.keys(body).join(',')}`);

            // Use synchronous fal.run endpoint — image gen is typically fast (2-10s)
            const response = await fetch(`https://fal.run/${args.model}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Key ${falKey}`,
                },
                body: JSON.stringify(body),
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
        imageUrls: v.optional(v.array(v.string())),
        falApiKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const falKey = args.falApiKey ?? process.env.FAL_KEY;
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

            // Build request body — include image URL for image-to-video models
            const body: Record<string, unknown> = {
                prompt: args.prompt,
                ...(args.duration ? { duration: args.duration } : {}),
                ...(args.aspectRatio ? { aspect_ratio: args.aspectRatio } : {}),
            };
            if (args.imageUrls && args.imageUrls.length > 0) {
                body.image_url = args.imageUrls[0];
            }

            console.log(`[fal:video] Generating with model=${args.model}, hasImages=${!!args.imageUrls?.length}, body keys: ${Object.keys(body).join(',')}`);

            // Submit to FalAI queue
            const response = await fetch(`https://queue.fal.run/${args.model}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Key ${falKey}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`FalAI submission failed (${response.status}): ${errText}`);
            }

            const result = await response.json() as { request_id?: string; status_url?: string; response_url?: string };
            const requestId = result.request_id;

            console.log('[fal:video] Queue submission response:', JSON.stringify(result));

            if (!requestId) {
                throw new Error('No request_id in FalAI queue response — the model may not support queued requests');
            }

            // Store request ID and any URLs from the response
            await ctx.runMutation(internal.media.updateMediaStatus, {
                mediaId: args.mediaId,
                status: 'generating',
                falRequestId: requestId,
            });

            // Schedule status check - use response_url from queue if available
            await ctx.scheduler.runAfter(5000, internal.fal.checkVideoStatus, {
                mediaId: args.mediaId,
                model: args.model,
                requestId,
                attempts: 0,
                ...(result.status_url ? { statusUrl: result.status_url } : {}),
                ...(result.response_url ? { responseUrl: result.response_url } : {}),
                ...(args.falApiKey ? { falApiKey: args.falApiKey } : {}),
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
        statusUrl: v.optional(v.string()),
        responseUrl: v.optional(v.string()),
        falApiKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const falKey = args.falApiKey ?? process.env.FAL_KEY;
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

        // Helper to extract video URL from a fal response object
        const extractVideoUrl = (data: Record<string, unknown>): string | undefined => {
            return (data.video as { url: string } | undefined)?.url
                ?? (data.output as { url: string } | undefined)?.url;
        };

        // Helper to download video and mark as completed
        const completeWithVideo = async (videoUrl: string) => {
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
        };

        // Helper to reschedule a status check
        const reschedule = async (delay: number) => {
            await ctx.scheduler.runAfter(delay, internal.fal.checkVideoStatus, {
                mediaId: args.mediaId,
                model: args.model,
                requestId: args.requestId,
                attempts: args.attempts + 1,
                ...(args.statusUrl ? { statusUrl: args.statusUrl } : {}),
                ...(args.responseUrl ? { responseUrl: args.responseUrl } : {}),
                ...(args.falApiKey ? { falApiKey: args.falApiKey } : {}),
            });
        };

        try {
            // Use explicit URLs from queue response if available, otherwise construct them
            const statusUrl = args.statusUrl ?? `https://queue.fal.run/${args.model}/requests/${args.requestId}/status`;
            const resultUrl = args.responseUrl ?? `https://queue.fal.run/${args.model}/requests/${args.requestId}`;

            console.log(`[fal:video] Status check #${args.attempts} for ${args.requestId}, URL: ${statusUrl}`);

            const statusResponse = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Key ${falKey}`,
                },
            });

            // If status endpoint returns 405, try fetching the result directly
            // Some models don't support the /status sub-endpoint or it becomes
            // unavailable after completion
            if (statusResponse.status === 405) {
                console.log(`[fal:video] Status endpoint returned 405, trying result URL directly: ${resultUrl}`);
                const directResponse = await fetch(resultUrl, {
                    headers: { 'Authorization': `Key ${falKey}` },
                });

                if (directResponse.ok) {
                    const result = await directResponse.json() as Record<string, unknown>;
                    console.log(`[fal:video] Direct result keys: ${Object.keys(result).join(',')}`);
                    const videoUrl = extractVideoUrl(result);
                    if (videoUrl) {
                        await completeWithVideo(videoUrl);
                        return;
                    }
                }

                // If direct fetch also fails, reschedule with backoff
                console.log(`[fal:video] Direct fetch also failed (${directResponse.status}), rescheduling...`);
                if (args.attempts < 30) {
                    await reschedule(Math.min(10000 * (args.attempts + 1), 30000));
                } else {
                    await ctx.runMutation(internal.media.updateMediaStatus, {
                        mediaId: args.mediaId,
                        status: 'failed',
                        errorMessage: 'Status check returned 405 and direct result fetch failed',
                    });
                }
                return;
            }

            if (!statusResponse.ok) {
                const errBody = await statusResponse.text();
                console.log(`[fal:video] Status check failed (${statusResponse.status}): ${errBody}`);
                throw new Error(
                    `Status check failed (${statusResponse.status}): ${errBody}`,
                );
            }

            const statusData = await statusResponse.json() as Record<string, unknown>;
            const status = statusData.status as string;
            console.log(`[fal:video] Status for ${args.requestId}: ${status}, keys: ${Object.keys(statusData).join(',')}`);

            // Some models include the result directly in the status response
            const inlineVideoUrl = extractVideoUrl(statusData);

            if (status === 'COMPLETED' || inlineVideoUrl) {
                // First check if video data is inline in the status response
                if (inlineVideoUrl) {
                    console.log(`[fal:video] Found video URL inline in status response`);
                    await completeWithVideo(inlineVideoUrl);
                    return;
                }

                // Otherwise fetch the result from the response URL
                // Use response_url from status response if provided
                const fetchUrl = (statusData.response_url as string) ?? resultUrl;
                console.log(`[fal:video] Fetching result from: ${fetchUrl}`);
                const resultResponse = await fetch(fetchUrl, {
                    headers: { 'Authorization': `Key ${falKey}` },
                });

                if (!resultResponse.ok) {
                    const errBody = await resultResponse.text();
                    throw new Error(`Result fetch failed (${resultResponse.status}): ${errBody}`);
                }

                const result = await resultResponse.json() as Record<string, unknown>;
                console.log(`[fal:video] Result keys: ${Object.keys(result).join(',')}`);

                const videoUrl = extractVideoUrl(result);

                if (videoUrl) {
                    await completeWithVideo(videoUrl);
                } else {
                    await ctx.runMutation(internal.media.updateMediaStatus, {
                        mediaId: args.mediaId,
                        status: 'failed',
                        errorMessage: 'No video URL in response',
                    });
                }
            } else if (status === 'FAILED') {
                await ctx.runMutation(internal.media.updateMediaStatus, {
                    mediaId: args.mediaId,
                    status: 'failed',
                    errorMessage: 'Video generation failed on FalAI',
                });
            } else {
                // Still in progress or in queue — reschedule
                console.log(`[fal:video] Request ${args.requestId} still ${status}, rescheduling...`);
                await reschedule(5000);
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Status check failed';
            console.log(`[fal:video] Error checking status for ${args.requestId}: ${errorMsg}`);
            // Retry on transient errors, with increasing backoff
            if (args.attempts < 10) {
                const backoff = Math.min(10000 * (args.attempts + 1), 30000);
                await reschedule(backoff);
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
