import { Hono } from 'hono';
import { getSandbox } from '@cloudflare/sandbox';
import { storage } from '../storage';
import { sendSuccess, sendError } from '../middleware';
import type { ExposePortRequest } from '../types';

const ports = new Hono<{ Bindings: Env }>();

/**
 * Get all exposed ports for a sandbox
 */
ports.get('/', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[PORTS_LIST] Getting exposed ports for sandbox ${sandboxId}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    
    // Get hostname from request for URL construction
    const url = new URL(c.req.url);
    const hostname = url.hostname;
    
    const exposedPorts = await sandbox.getExposedPorts(hostname);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[PORTS_LIST] Found ${exposedPorts.length} exposed ports`);
    return sendSuccess(c, exposedPorts, 'Exposed ports retrieved successfully');
    
  } catch (error) {
    console.error(`[PORTS_LIST] Failed to get exposed ports for ${sandboxId}:`, error);
    return sendError(c, 'Failed to get exposed ports', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Expose a port in a sandbox
 */
ports.post('/expose', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { port }: ExposePortRequest = await c.req.json();
    
    if (!port || typeof port !== 'number') {
      return sendError(c, 'Port number is required', 400);
    }

    if (port < 1024 || port > 65535) {
      return sendError(c, 'Port must be between 1024 and 65535', 400);
    }

    console.log(`[PORTS_EXPOSE] Exposing port ${port} for sandbox ${sandboxId}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    
    // Get hostname from request for URL construction
    const url = new URL(c.req.url);
    const hostname = url.hostname;
    
    const exposedPort = await sandbox.exposePort(port, { 
      name: `port-${port}`,
      hostname
    });

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[PORTS_EXPOSE] Successfully exposed port ${port}: ${exposedPort.url}`);
    return sendSuccess(c, exposedPort, 'Port exposed successfully');
    
  } catch (error) {
    console.error(`[PORTS_EXPOSE] Failed to expose port for ${sandboxId}:`, error);
    return sendError(c, 'Failed to expose port', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Unexpose a port in a sandbox
 */
ports.delete('/:port', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  const portStr = c.req.param('port');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }
  
  if (!portStr) {
    return sendError(c, 'Port is required', 400);
  }

  const port = parseInt(portStr, 10);
  if (isNaN(port)) {
    return sendError(c, 'Invalid port number', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[PORTS_UNEXPOSE] Unexposing port ${port} for sandbox ${sandboxId}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.unexposePort(port);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[PORTS_UNEXPOSE] Successfully unexposed port ${port}`);
    return sendSuccess(c, { port, unexposed: true }, 'Port unexposed successfully');
    
  } catch (error) {
    console.error(`[PORTS_UNEXPOSE] Failed to unexpose port ${port}:`, error);
    return sendError(c, 'Failed to unexpose port', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

export { ports };