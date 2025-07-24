import { Hono } from 'hono';
import { storage } from '../storage';
import { sendSuccess } from '../middleware';
import type { GlobalMetrics } from '../types';

const metrics = new Hono<{ Bindings: Env }>();

/**
 * Get global metrics across all sandboxes
 */
metrics.get('/', async (c) => {
  console.log('[METRICS] Computing global metrics');
  
  const allSandboxes = storage.getAllSandboxes();
  const totalSandboxes = allSandboxes.length;
  const activeSandboxes = allSandboxes.filter(s => s.status === 'running').length;
  
  let totalCommands = 0;
  let totalCommandTime = 0;
  let totalCreationTime = 0;
  const creationTimes: number[] = [];
  
  allSandboxes.forEach(sandbox => {
    totalCommands += sandbox.metrics.totalCommands;
    totalCommandTime += sandbox.metrics.avgCommandTime * sandbox.metrics.totalCommands;
    totalCreationTime += sandbox.metrics.creationTime;
    creationTimes.push(sandbox.metrics.creationTime);
  });

  // Calculate P99 creation time
  creationTimes.sort((a, b) => a - b);
  const p99Index = Math.ceil(creationTimes.length * 0.99) - 1;
  const p99CreationTime = creationTimes.length > 0 ? creationTimes[p99Index] || 0 : 0;

  const globalMetrics: GlobalMetrics = {
    totalSandboxes,
    activeSandboxes,
    avgCreationTime: totalSandboxes > 0 ? totalCreationTime / totalSandboxes : 0,
    p99CreationTime,
    totalCommands,
    avgCommandTime: totalCommands > 0 ? totalCommandTime / totalCommands : 0,
    successRate: 0.987 // Mock success rate for demo
  };

  console.log('[METRICS] Global metrics computed:', {
    totalSandboxes,
    activeSandboxes,
    totalCommands,
    avgCreationTime: globalMetrics.avgCreationTime,
    p99CreationTime
  });

  return sendSuccess(c, globalMetrics, 'Global metrics retrieved successfully');
});

/**
 * Get metrics for a specific sandbox
 */
metrics.get('/:sandboxId', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return c.json({ error: 'Sandbox ID is required' }, 400);
  }

  const sandbox = storage.getSandbox(sandboxId);
  if (!sandbox) {
    return c.json({ error: 'Sandbox not found' }, 404);
  }

  console.log(`[METRICS] Retrieved metrics for sandbox ${sandboxId}`);
  
  const commandHistory = storage.getCommandHistory(sandboxId);
  const recentCommands = commandHistory.slice(0, 10); // Last 10 commands
  
  return sendSuccess(c, {
    sandbox: {
      id: sandbox.id,
      name: sandbox.name,
      status: sandbox.status,
      createdAt: sandbox.createdAt,
      lastActivity: sandbox.lastActivity,
      metrics: sandbox.metrics
    },
    recentCommands,
    totalCommandsInHistory: commandHistory.length
  }, 'Sandbox metrics retrieved successfully');
});

export { metrics };