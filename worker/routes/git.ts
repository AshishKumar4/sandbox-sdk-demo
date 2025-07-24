import { Hono } from 'hono';
import { getSandbox } from '@cloudflare/sandbox';
import { storage } from '../storage';
import { sendSuccess, sendError } from '../middleware';
import type { GitCloneRequest } from '../types';

const git = new Hono<{ Bindings: Env }>();

/**
 * Clone a git repository into a sandbox
 */
git.post('/clone', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { repoUrl, branch = 'main', targetDir }: GitCloneRequest = await c.req.json();
    
    if (!repoUrl || typeof repoUrl !== 'string') {
      return sendError(c, 'Repository URL is required', 400);
    }

    // Basic URL validation
    if (!repoUrl.startsWith('https://') && !repoUrl.startsWith('git@')) {
      return sendError(c, 'Invalid repository URL format', 400);
    }

    console.log(`[GIT_CLONE] Cloning repository for sandbox ${sandboxId}:`, {
      repoUrl,
      branch,
      targetDir
    });
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.gitCheckout(repoUrl, { branch, targetDir });

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[GIT_CLONE] Successfully cloned repository: ${repoUrl}`);
    return sendSuccess(c, { 
      repoUrl, 
      branch, 
      targetDir: targetDir || repoUrl.split('/').pop()?.replace('.git', '') || 'repository',
      cloned: true 
    }, 'Repository cloned successfully');
    
  } catch (error) {
    console.error(`[GIT_CLONE] Failed to clone repository for ${sandboxId}:`, error);
    return sendError(c, 'Failed to clone repository', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

export { git };