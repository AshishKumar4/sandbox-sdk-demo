import { Hono } from 'hono';
import { getSandbox } from '@cloudflare/sandbox';
import { storage } from '../storage';
import { sendError } from '../middleware';

const sandboxProxy = new Hono<{ Bindings: Env }>();

/**
 * Proxy requests to services running inside a specific sandbox
 * Route: /sandboxes/:id/service/*
 */
sandboxProxy.all('/:sandboxId/service/*', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  const servicePath = c.req.param('*');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  if (sandboxState.status !== 'running') {
    return sendError(c, 'Sandbox is not running', 503);
  }

  console.log(`[SANDBOX_PROXY] Proxying request to sandbox ${sandboxId}: /${servicePath}`);

  try {
    // Create a new request with the service path
    const originalUrl = new URL(c.req.url);
    const serviceUrl = new URL(`http://localhost/${servicePath || ''}`, originalUrl.origin);
    
    // Copy query parameters
    originalUrl.searchParams.forEach((value, key) => {
      serviceUrl.searchParams.set(key, value);
    });

    const proxyRequest = new Request(serviceUrl.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
    });

    // Add sandbox identification header
    proxyRequest.headers.set('X-Sandbox-Id', sandboxId);

    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    const response = await sandbox.containerFetch(proxyRequest);

    // Update sandbox activity
    storage.updateSandboxActivity(sandboxId);

    console.log(`[SANDBOX_PROXY] Proxy response: ${response.status} for sandbox ${sandboxId}`);
    return response;

  } catch (error) {
    console.error(`[SANDBOX_PROXY] Proxy failed for sandbox ${sandboxId}:`, error);
    return sendError(c, 'Failed to proxy request to sandbox service', 502, 
      error instanceof Error ? error.message : 'Unknown proxy error');
  }
});

/**
 * Get information about exposed ports for a sandbox
 */
sandboxProxy.get('/:sandboxId/service-info', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    const url = new URL(c.req.url);
    const hostname = url.hostname;
    
    const exposedPorts = await sandbox.getExposedPorts(hostname);
    
    console.log(`[SANDBOX_PROXY] Retrieved ${exposedPorts.length} exposed ports for ${sandboxId}`);
    return c.json({
      success: true,
      data: exposedPorts.map(port => ({
        ...port,
        // Provide service URLs that route through our proxy
        serviceUrl: `${url.protocol}//${hostname}/sandboxes/${sandboxId}/service/`
      })),
      message: 'Exposed ports retrieved successfully'
    });

  } catch (error) {
    console.error(`[SANDBOX_PROXY] Failed to get ports for ${sandboxId}:`, error);
    return sendError(c, 'Failed to get exposed ports', 500, 
      error instanceof Error ? error.message : 'Unknown error');
  }
});

export { sandboxProxy };