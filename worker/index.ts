import { Hono } from 'hono';

// Export the Sandbox class for Cloudflare Workers bindings
export { Sandbox } from '@cloudflare/sandbox';

// Import middleware
import { corsMiddleware, loggingMiddleware, errorMiddleware } from './middleware';

// Import route handlers
import { sandboxes } from './routes/sandboxes';
import { files } from './routes/files';
import { processes } from './routes/processes';
import { git } from './routes/git';
import { ports } from './routes/ports';
import { metrics } from './routes/metrics';
import { sandboxProxy } from './routes/sandbox-proxy';
import { startupScripts } from './routes/startup-scripts';

/**
 * Main Hono application
 */
const app = new Hono<{ Bindings: Env }>();

/**
 * Global middleware
 */
app.use('*', loggingMiddleware);
app.use('*', corsMiddleware);
app.use('*', errorMiddleware);

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Cloudflare Sandbox SDK Demo'
  });
});

/**
 * Core API routes
 */
app.route('/api/sandboxes', sandboxes);
app.route('/api/metrics', metrics);
app.route('/api/startup-scripts', startupScripts);

/**
 * Sandbox-specific API routes
 * These handle operations on specific sandboxes
 */
app.route('/api/sandboxes/:sandboxId/files', files);
app.route('/api/sandboxes/:sandboxId/processes', processes);
app.route('/api/sandboxes/:sandboxId/git', git);
app.route('/api/sandboxes/:sandboxId/ports', ports);

/**
 * Sandbox service proxy routes
 * These handle requests to services running inside sandboxes
 * Format: /sandboxes/:id/service/* -> proxies to service in sandbox
 */
app.route('/sandboxes', sandboxProxy);

/**
 * Internal sandbox SDK API routes
 * These are called internally by the sandbox SDK
 */
app.get('/api/process/list', async (c) => {
  console.log('[INTERNAL_API] Process list requested by sandbox SDK');
  
  // Return empty list or mock data since this is internal SDK communication
  return c.json([]);
});

app.get('/api/ports', async (c) => {
  console.log('[INTERNAL_API] Ports list requested by sandbox SDK');
  
  // Return empty list since this is internal SDK communication
  return c.json([]);
});

/**
 * Legacy compatibility routes
 */
app.post('/api/sandboxes/:sandboxId/expose-port', async (c) => {
  const body = await c.req.json();
  
  // Forward to the new endpoint
  return await app.fetch(
    new Request(`${c.req.url.replace('/expose-port', '/ports/expose')}`, {
      method: 'POST',
      headers: c.req.raw.headers,
      body: JSON.stringify(body)
    }),
    c.env
  );
});

/**
 * Cloudflare Workers handler
 */
const handler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle all requests through Hono - no blanket proxy
    return app.fetch(request, env);
  }
};

export default handler;