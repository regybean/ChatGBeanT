import { httpRouter } from 'convex/server';

const http = httpRouter();

// Health check endpoint
http.route({
  path: '/health',
  method: 'GET',
  handler: async () => {
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
});

export default http;
