import { Hono } from 'hono';
import { getSandbox } from '@cloudflare/sandbox';
import { storage } from '../storage';
import { sendSuccess, sendError } from '../middleware';
import type { StartProcessRequest } from '../types';

const processes = new Hono<{ Bindings: Env }>();

/**
 * List all processes in a sandbox
 */
processes.get('/', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[PROCESSES_LIST] Listing processes for sandbox ${sandboxId}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    
    // Use ps command to list processes instead of SDK method
    const result = await sandbox.exec('ps aux --no-headers | head -20');
    
    console.log(`[PROCESSES_LIST] Raw ps output:`, result.stdout.substring(0, 300));
    
    const processList = result.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) return null;
        
        const [, pid, , , , , , stat, , , ...commandParts] = parts;
        const command = commandParts.join(' ');
        
        return {
          id: `proc-${pid}`,
          pid: parseInt(pid),
          command: command || 'unknown',
          status: stat?.includes('Z') ? 'stopped' : 'running',
          startTime: new Date().toISOString(), // Approximate since ps doesn't give exact time
          logs: []
        };
      })
      .filter(proc => proc !== null);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[PROCESSES_LIST] Found ${processList.length} processes`);
    return sendSuccess(c, processList, 'Processes listed successfully');
    
  } catch (error) {
    console.error(`[PROCESSES_LIST] Failed to list processes for ${sandboxId}:`, error);
    return sendError(c, 'Failed to list processes', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Start a new process in a sandbox
 */
processes.post('/', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { command }: StartProcessRequest = await c.req.json();
    
    if (!command || typeof command !== 'string') {
      return sendError(c, 'Command is required', 400);
    }

    console.log(`[PROCESSES_START] Starting process for sandbox ${sandboxId}: ${command}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    const process = await sandbox.startProcess(command);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[PROCESSES_START] Started process ${process.id} with PID ${process.pid}`);
    return sendSuccess(c, process, 'Process started successfully');
    
  } catch (error) {
    console.error(`[PROCESSES_START] Failed to start process for ${sandboxId}:`, error);
    return sendError(c, 'Failed to start process', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Kill a specific process
 */
processes.delete('/:processId', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  const processId = c.req.param('processId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }
  
  if (!processId) {
    return sendError(c, 'Process ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[PROCESSES_KILL] Killing process ${processId} in sandbox ${sandboxId}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.killProcess(processId);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[PROCESSES_KILL] Successfully killed process ${processId}`);
    return sendSuccess(c, { processId, killed: true }, 'Process killed successfully');
    
  } catch (error) {
    console.error(`[PROCESSES_KILL] Failed to kill process ${processId}:`, error);
    return sendError(c, 'Failed to kill process', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Get process logs
 */
processes.get('/:processId/logs', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  const processId = c.req.param('processId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }
  
  if (!processId) {
    return sendError(c, 'Process ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[PROCESSES_LOGS] Getting logs for process ${processId} in sandbox ${sandboxId}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    const logs = await sandbox.getProcessLogs(processId);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[PROCESSES_LOGS] Retrieved logs for process ${processId}`);
    return sendSuccess(c, logs, 'Process logs retrieved successfully');
    
  } catch (error) {
    console.error(`[PROCESSES_LOGS] Failed to get logs for process ${processId}:`, error);
    return sendError(c, 'Failed to get process logs', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

export { processes };