import { Hono } from 'hono'
import type { Env } from '../types'
import { sendSuccess, sendError } from '../middleware'
import { storage } from '../storage'

interface StartupScript {
  id: string
  name: string
  content: string
  description?: string
  createdAt: string
  lastUsed?: string
}

const startupScripts = new Hono<{ Bindings: Env }>()

// Get all startup scripts
startupScripts.get('/', async (c) => {
  console.log('[STARTUP_SCRIPTS] Getting all startup scripts')
  
  try {
    const scripts = await storage.getStartupScripts()
    console.log(`[STARTUP_SCRIPTS] Found ${scripts.length} scripts`)
    
    return sendSuccess(c, scripts)
  } catch (error) {
    console.error('[STARTUP_SCRIPTS] Error getting scripts:', error)
    return sendError(c, 'Failed to get startup scripts', 500)
  }
})

// Get a specific startup script
startupScripts.get('/:id', async (c) => {
  const scriptId = c.req.param('id')
  console.log(`[STARTUP_SCRIPTS] Getting script: ${scriptId}`)
  
  try {
    const script = await storage.getStartupScript(scriptId)
    if (!script) {
      return sendError(c, 'Startup script not found', 404)
    }
    
    return sendSuccess(c, script)
  } catch (error) {
    console.error(`[STARTUP_SCRIPTS] Error getting script ${scriptId}:`, error)
    return sendError(c, 'Failed to get startup script', 500)
  }
})

// Create a new startup script
startupScripts.post('/', async (c) => {
  console.log('[STARTUP_SCRIPTS] Creating new startup script')
  
  try {
    const { name, content, description } = await c.req.json()
    
    if (!name || !content) {
      return sendError(c, 'Name and content are required', 400)
    }
    
    const scriptId = `script-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    
    const newScript: StartupScript = {
      id: scriptId,
      name: name.trim(),
      content: content.trim(),
      description: description?.trim(),
      createdAt: new Date().toISOString()
    }
    
    await storage.setStartupScript(scriptId, newScript)
    
    console.log(`[STARTUP_SCRIPTS] Created script: ${scriptId} - ${name}`)
    return sendSuccess(c, newScript)
  } catch (error) {
    console.error('[STARTUP_SCRIPTS] Error creating script:', error)
    return sendError(c, 'Failed to create startup script', 500)
  }
})

// Update an existing startup script
startupScripts.put('/:id', async (c) => {
  const scriptId = c.req.param('id')
  console.log(`[STARTUP_SCRIPTS] Updating script: ${scriptId}`)
  
  try {
    const existingScript = await storage.getStartupScript(scriptId)
    if (!existingScript) {
      return sendError(c, 'Startup script not found', 404)
    }
    
    const { name, content, description } = await c.req.json()
    
    if (!name || !content) {
      return sendError(c, 'Name and content are required', 400)
    }
    
    const updatedScript: StartupScript = {
      ...existingScript,
      name: name.trim(),
      content: content.trim(),
      description: description?.trim()
    }
    
    await storage.setStartupScript(scriptId, updatedScript)
    
    console.log(`[STARTUP_SCRIPTS] Updated script: ${scriptId} - ${name}`)
    return sendSuccess(c, updatedScript)
  } catch (error) {
    console.error(`[STARTUP_SCRIPTS] Error updating script ${scriptId}:`, error)
    return sendError(c, 'Failed to update startup script', 500)
  }
})

// Delete a startup script
startupScripts.delete('/:id', async (c) => {
  const scriptId = c.req.param('id')
  console.log(`[STARTUP_SCRIPTS] Deleting script: ${scriptId}`)
  
  try {
    const existingScript = await storage.getStartupScript(scriptId)
    if (!existingScript) {
      return sendError(c, 'Startup script not found', 404)
    }
    
    await storage.deleteStartupScript(scriptId)
    
    console.log(`[STARTUP_SCRIPTS] Deleted script: ${scriptId}`)
    return sendSuccess(c, { deleted: true, id: scriptId })
  } catch (error) {
    console.error(`[STARTUP_SCRIPTS] Error deleting script ${scriptId}:`, error)
    return sendError(c, 'Failed to delete startup script', 500)
  }
})

// Mark a startup script as used (updates lastUsed timestamp)
startupScripts.post('/:id/use', async (c) => {
  const scriptId = c.req.param('id')
  console.log(`[STARTUP_SCRIPTS] Marking script as used: ${scriptId}`)
  
  try {
    const existingScript = await storage.getStartupScript(scriptId)
    if (!existingScript) {
      return sendError(c, 'Startup script not found', 404)
    }
    
    const updatedScript: StartupScript = {
      ...existingScript,
      lastUsed: new Date().toISOString()
    }
    
    await storage.setStartupScript(scriptId, updatedScript)
    
    console.log(`[STARTUP_SCRIPTS] Marked script as used: ${scriptId}`)
    return sendSuccess(c, updatedScript)
  } catch (error) {
    console.error(`[STARTUP_SCRIPTS] Error marking script as used ${scriptId}:`, error)
    return sendError(c, 'Failed to update startup script usage', 500)
  }
})

export { startupScripts }