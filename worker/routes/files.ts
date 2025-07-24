import { Hono } from 'hono';
import { getSandbox } from '@cloudflare/sandbox';
import { storage } from '../storage';
import { sendSuccess, sendError } from '../middleware';
import type { WriteFileRequest, FileInfo } from '../types';

const files = new Hono<{ Bindings: Env }>();

/**
 * List files in a sandbox directory
 */
files.get('/', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  const path = c.req.query('path') || '/';
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[FILES_LIST] Listing files for sandbox ${sandboxId} at path: ${path}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    
    // First, check if the directory exists and is accessible
    const pathCheck = await sandbox.exec(`ls -la "${path}" 2>/dev/null || echo "PATH_NOT_FOUND"`);
    
    if (pathCheck.stdout.includes('PATH_NOT_FOUND')) {
      console.log(`[FILES_LIST] Path ${path} not found or not accessible`);
      return sendSuccess(c, [], 'Directory not found, returning empty list');
    }
    
    // Use ls -la for more reliable output
    const result = await sandbox.exec(`ls -la "${path}" | tail -n +2`); // Skip the 'total' line
    
    console.log(`[FILES_LIST] Raw ls output:`, result.stdout.substring(0, 500));
    
    const fileList: FileInfo[] = result.stdout
      .split('\n')
      .filter((line: string) => line.trim() && !line.startsWith('total'))
      .map((line: string) => {
        // Parse ls -la output: permissions user group size date time name
        const parts = line.trim().split(/\s+/);
        if (parts.length < 9) return null;
        
        const permissions = parts[0];
        const name = parts.slice(8).join(' '); // Handle filenames with spaces
        const isDirectory = permissions.startsWith('d');
        const fullPath = path.endsWith('/') ? `${path}${name}` : `${path}/${name}`;
        
        // Skip . and .. entries
        if (name === '.' || name === '..') return null;
        
        return {
          name,
          path: fullPath,
          type: isDirectory ? 'directory' : 'file',
          lastModified: new Date().toISOString()
        };
      })
      .filter((item): item is FileInfo => item !== null);

    console.log(`[FILES_LIST] Found ${fileList.length} files/directories:`, fileList.map(f => `${f.name} (${f.type})`));
    return sendSuccess(c, fileList, 'Files listed successfully');
    
  } catch (error) {
    console.error(`[FILES_LIST] Failed to list files for ${sandboxId}:`, error);
    return sendError(c, 'Failed to list files', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Write a file to sandbox
 */
files.post('/', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { path, content }: WriteFileRequest = await c.req.json();
    
    if (!path || typeof path !== 'string') {
      return sendError(c, 'File path is required', 400);
    }
    
    if (content === undefined) {
      return sendError(c, 'File content is required', 400);
    }

    console.log(`[FILES_WRITE] Writing file for sandbox ${sandboxId}: ${path}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.writeFile(path, content);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[FILES_WRITE] Successfully wrote file: ${path}`);
    return sendSuccess(c, { path, written: true }, 'File written successfully');
    
  } catch (error) {
    console.error(`[FILES_WRITE] Failed to write file for ${sandboxId}:`, error);
    return sendError(c, 'Failed to write file', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Read a file from sandbox
 */
files.get('/read/*', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  const filePath = '/' + (c.req.param('*') || '');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    console.log(`[FILES_READ] Reading file for sandbox ${sandboxId}: ${filePath}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    const file = await sandbox.readFile(filePath);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[FILES_READ] Successfully read file: ${filePath} (${file.content.length} chars)`);
    return sendSuccess(c, { path: filePath, content: file.content }, 'File read successfully');
    
  } catch (error) {
    console.error(`[FILES_READ] Failed to read file for ${sandboxId}:`, error);
    return sendError(c, 'Failed to read file', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Create a directory in sandbox
 */
files.post('/mkdir', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { path } = await c.req.json();
    
    if (!path) {
      return sendError(c, 'Directory path is required', 400);
    }

    console.log(`[FILES_MKDIR] Creating directory for sandbox ${sandboxId}: ${path}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.mkdir(path);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[FILES_MKDIR] Successfully created directory: ${path}`);
    return sendSuccess(c, { path, created: true }, 'Directory created successfully');
    
  } catch (error) {
    console.error(`[FILES_MKDIR] Failed to create directory for ${sandboxId}:`, error);
    return sendError(c, 'Failed to create directory', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Delete a file or directory from sandbox
 */
files.post('/delete', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { path } = await c.req.json();
    
    if (!path) {
      return sendError(c, 'File path is required', 400);
    }

    console.log(`[FILES_DELETE] Deleting file/directory for sandbox ${sandboxId}: ${path}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.deleteFile(path);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[FILES_DELETE] Successfully deleted: ${path}`);
    return sendSuccess(c, { path, deleted: true }, 'File/directory deleted successfully');
    
  } catch (error) {
    console.error(`[FILES_DELETE] Failed to delete file/directory for ${sandboxId}:`, error);
    return sendError(c, 'Failed to delete file/directory', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Rename a file or directory in sandbox
 */
files.post('/rename', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { oldPath, newPath } = await c.req.json();
    
    if (!oldPath || !newPath) {
      return sendError(c, 'Both old path and new path are required', 400);
    }

    console.log(`[FILES_RENAME] Renaming file/directory for sandbox ${sandboxId}: ${oldPath} -> ${newPath}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.renameFile(oldPath, newPath);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[FILES_RENAME] Successfully renamed: ${oldPath} -> ${newPath}`);
    return sendSuccess(c, { oldPath, newPath, renamed: true }, 'File/directory renamed successfully');
    
  } catch (error) {
    console.error(`[FILES_RENAME] Failed to rename file/directory for ${sandboxId}:`, error);
    return sendError(c, 'Failed to rename file/directory', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Move a file or directory in sandbox
 */
files.post('/move', async (c) => {
  const sandboxId = c.req.param('sandboxId');
  
  if (!sandboxId) {
    return sendError(c, 'Sandbox ID is required', 400);
  }

  const sandboxState = storage.getSandbox(sandboxId);
  if (!sandboxState) {
    return sendError(c, 'Sandbox not found', 404);
  }

  try {
    const { sourcePath, destinationPath } = await c.req.json();
    
    if (!sourcePath || !destinationPath) {
      return sendError(c, 'Both source path and destination path are required', 400);
    }

    console.log(`[FILES_MOVE] Moving file/directory for sandbox ${sandboxId}: ${sourcePath} -> ${destinationPath}`);
    
    const sandbox = getSandbox(c.env.Sandbox, sandboxId);
    await sandbox.moveFile(sourcePath, destinationPath);

    storage.updateSandboxActivity(sandboxId);
    
    console.log(`[FILES_MOVE] Successfully moved: ${sourcePath} -> ${destinationPath}`);
    return sendSuccess(c, { sourcePath, destinationPath, moved: true }, 'File/directory moved successfully');
    
  } catch (error) {
    console.error(`[FILES_MOVE] Failed to move file/directory for ${sandboxId}:`, error);
    return sendError(c, 'Failed to move file/directory', 500, error instanceof Error ? error.message : 'Unknown error');
  }
});

export { files };