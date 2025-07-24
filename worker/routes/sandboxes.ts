import { Hono } from 'hono';
import { getSandbox } from '@cloudflare/sandbox';
import { storage } from '../storage';
import { sendSuccess, sendError } from '../middleware';
import type { 
  CreateSandboxRequest, 
  ExecuteCommandRequest,
  StreamCommandRequest,
  SandboxState, 
  CommandResult 
} from '../types';

const sandboxes = new Hono<{ Bindings: Env }>();

/**
 * Get all sandboxes
 */
sandboxes.get('/', async (c) => {
  console.log('[SANDBOXES] Fetching all sandboxes');
  const allSandboxes = storage.getAllSandboxes();
  return sendSuccess(c, allSandboxes);
});

/**
 * Create a new sandbox
 */
sandboxes.post('/', async (c) => {
  try {
    const { name, startupScript }: CreateSandboxRequest = await c.req.json();
    
    if (!name || typeof name !== 'string') {
      return sendError(c, 'Sandbox name is required', 400);
    }

    const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`[SANDBOX_CREATE] Creating sandbox ${sandboxId} with name: ${name}`);

    const newSandbox: SandboxState = {
      id: sandboxId,
      name,
      status: 'creating',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      metrics: {
        creationTime: 0,
        totalCommands: 0,
        avgCommandTime: 0,
        uptime: 0
      },
      processes: [],
      exposedPorts: []
    };

    storage.setSandbox(sandboxId, newSandbox);

    // Initialize the actual sandbox
    try {
      const sandbox = getSandbox(c.env.Sandbox, sandboxId);
      console.log(`[SANDBOX_CREATE] getSandbox succeeded for ${sandboxId}`);
      
      const startTime = Date.now();
      
      // Test basic functionality with ls command
      const lsResult = await sandbox.exec('ls');
      console.log(`[SANDBOX_CREATE] ls result for ${sandboxId}:`, {
        exitCode: lsResult.exitCode,
        stdout: lsResult.stdout,
        stderr: lsResult.stderr
      });
      
      // Run startup script if provided
      if (startupScript) {
        console.log(`[SANDBOX_CREATE] Running startup script for ${sandboxId}`);
        await sandbox.writeFile('/startup.sh', startupScript);
        const startupResult = await sandbox.exec('chmod +x /startup.sh && /startup.sh');
        console.log(`[SANDBOX_CREATE] Startup script result for ${sandboxId}:`, {
          exitCode: startupResult.exitCode,
          stdout: startupResult.stdout,
          stderr: startupResult.stderr
        });
      }

      const creationTime = Date.now() - startTime;
      newSandbox.status = 'running';
      newSandbox.metrics.creationTime = creationTime;
      storage.setSandbox(sandboxId, newSandbox);
      
      console.log(`[SANDBOX_CREATE] Successfully created sandbox ${sandboxId} in ${creationTime}ms`);
      return sendSuccess(c, newSandbox, 'Sandbox created successfully');
      
    } catch (error) {
      console.error(`[SANDBOX_CREATE] Failed to create sandbox ${sandboxId}:`, error);
      console.error(`[SANDBOX_CREATE] Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      newSandbox.status = 'error';
      storage.setSandbox(sandboxId, newSandbox);
      return sendError(c, 'Failed to initialize sandbox', 500, error instanceof Error ? error.message : 'Unknown error');
    }
  } catch (error) {
    console.error('[SANDBOX_CREATE] Request parsing error:', error);
    return sendError(c, 'Invalid request body', 400);
  }
});

/**
 * Delete a sandbox
 */
sandboxes.delete('/:id', async (c) => {
  const sandboxId = c.req.param('id');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  console.log(`[SANDBOX_DELETE] Deleting sandbox ${sandboxId}`);
  storage.deleteSandbox(sandboxId);
  
  return sendSuccess(c, { deleted: true }, 'Sandbox deleted successfully');
});

/**
 * Execute a command in a sandbox
 */
sandboxes.post('/:id/execute', async (c) => {
  const sandboxId = c.req.param('id');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { command }: ExecuteCommandRequest = await c.req.json();
    
    if (!command || typeof command !== 'string') {
      return sendError(c, 'Command is required', 400);
    }

    console.log(`[COMMAND_EXECUTE] Executing command in sandbox ${sandboxId}: "${command}"`);
    console.log(`[COMMAND_EXECUTE] Sandbox state:`, {
      status: sandboxState.status,
      createdAt: sandboxState.createdAt,
      lastActivity: sandboxState.lastActivity
    });
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    console.log(`[COMMAND_EXECUTE] getSandbox succeeded for ${sandboxId}`);
    
    const startTime = Date.now();
    console.log(`[COMMAND_EXECUTE] Starting command execution at ${startTime}`);
    
    const result = await sandbox.exec(command);
    const executionTime = Date.now() - startTime;
    
    console.log(`[COMMAND_EXECUTE] Command completed in ${executionTime}ms:`, {
      command,
      exitCode: result.exitCode,
      stdoutLength: result.stdout?.length || 0,
      stderrLength: result.stderr?.length || 0,
      stdout: result.stdout?.substring(0, 200) + (result.stdout?.length > 200 ? '...' : ''),
      stderr: result.stderr?.substring(0, 200) + (result.stderr?.length > 200 ? '...' : '')
    });

    const commandResult: CommandResult = {
      id: `cmd-${Date.now()}`,
      command,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      executionTime,
      timestamp: new Date().toISOString()
    };

    // Update storage
    storage.updateSandboxMetrics(sandboxId, executionTime);
    storage.updateSandboxActivity(sandboxId);
    storage.addCommandToHistory(sandboxId, commandResult);

    console.log(`[COMMAND_EXECUTE] Command execution completed successfully for ${sandboxId}`);
    return sendSuccess(c, commandResult, 'Command executed successfully');
    
  } catch (error) {
    console.error(`[COMMAND_EXECUTE] Command execution failed for ${sandboxId}:`, error);
    console.error(`[COMMAND_EXECUTE] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return sendError(c, 'Command execution failed', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Stream command execution
 */
sandboxes.post('/:id/stream', async (c) => {
  const sandboxId = c.req.param('id');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { command }: StreamCommandRequest = await c.req.json();
    
    if (!command || typeof command !== 'string') {
      return sendError(c, 'Command is required', 400);
    }

    console.log(`[STREAM_EXECUTE] Starting streaming execution for sandbox ${sandboxId}: "${command}"`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    console.log(`[STREAM_EXECUTE] getSandbox succeeded for ${sandboxId}`);
    
    // Create a ReadableStream for streaming output
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log(`[STREAM_EXECUTE] Starting streaming command execution for ${sandboxId}`);
          await sandbox.exec(command, {
            stream: true,
            onOutput: (stream: string, data: string) => {
              console.log(`[STREAM_EXECUTE] Stream output from ${sandboxId}:`, { stream, dataLength: data.length });
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ stream, data })}\n\n`));
            }
          });
          console.log(`[STREAM_EXECUTE] Streaming command completed for ${sandboxId}`);
          controller.close();
        } catch (error) {
          console.error(`[STREAM_EXECUTE] Streaming command failed for ${sandboxId}:`, error);
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
    
  } catch (error) {
    console.error(`[STREAM_EXECUTE] Request parsing error for ${sandboxId}:`, error);
    return sendError(c, 'Invalid request body', 400);
  }
});

/**
 * Ping a sandbox to check if it's healthy and responsive
 */
sandboxes.get('/:id/ping', async (c) => {
  const sandboxId = c.req.param('id');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[SANDBOX_PING] Pinging sandbox ${sandboxId}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    const startTime = Date.now();
    
    // Use a simple command as ping since ping() method might not be available
    await sandbox.exec('echo "ping"');
    
    const pingTime = Date.now() - startTime;
    console.log(`[SANDBOX_PING] Sandbox ${sandboxId} responded in ${pingTime}ms`);
    
    // Update sandbox status to running if ping succeeds
    if (sandboxState.status !== 'running') {
      sandboxState.status = 'running';
      storage.setSandbox(sandboxId, sandboxState);
    }
    
    storage.updateSandboxActivity(sandboxId);
    
    return sendSuccess(c, { 
      healthy: true, 
      pingTime,
      status: 'running' 
    }, 'Sandbox is healthy');
    
  } catch (error) {
    console.error(`[SANDBOX_PING] Ping failed for ${sandboxId}:`, error);
    
    // Update sandbox status to error if ping fails
    sandboxState.status = 'error';
    storage.setSandbox(sandboxId, sandboxState);
    
    return sendError(c, 'Sandbox ping failed', 503, error instanceof Error ? error.message : 'Unknown error');
  }
});

export { sandboxes };