import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { SandboxEnvironment, GlobalMetrics, StartupScript, CommandResult, TerminalEntry } from '@/types/sandbox'

interface SandboxContextType {
  sandboxes: SandboxEnvironment[]
  selectedSandbox: SandboxEnvironment | null
  globalMetrics: GlobalMetrics
  startupScripts: StartupScript[]
  commandHistory: CommandResult[]
  createSandbox: (name: string, startupScript?: string) => Promise<SandboxEnvironment>
  deleteSandbox: (id: string) => Promise<void>
  selectSandbox: (sandbox: SandboxEnvironment | null) => void
  executeCommand: (sandboxId: string, command: string) => Promise<CommandResult>
  streamCommand: (sandboxId: string, command: string, onData: (data: string) => void) => Promise<void>
  saveStartupScript: (script: StartupScript) => void
  updateSandboxMetrics: (sandboxId: string) => void
  pingSandbox: (sandboxId: string) => Promise<{ healthy: boolean; pingTime: number; status: string }>
  getTerminalHistory: (sandboxId: string) => TerminalEntry[]
  addTerminalEntry: (sandboxId: string, entry: TerminalEntry) => void
  clearTerminalHistory: (sandboxId: string) => void
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined)

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  const [sandboxes, setSandboxes] = useState<SandboxEnvironment[]>([])
  const [selectedSandbox, setSelectedSandbox] = useState<SandboxEnvironment | null>(null)
  const [startupScripts, setStartupScripts] = useState<StartupScript[]>([])
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([])
  const [terminalHistories, setTerminalHistories] = useState<Map<string, TerminalEntry[]>>(new Map())
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalSandboxes: 0,
    activeSandboxes: 0,
    avgCreationTime: 0,
    p99CreationTime: 0,
    totalCommands: 0,
    avgCommandTime: 0,
    successRate: 0
  })

  const createSandbox = useCallback(async (name: string, startupScript?: string): Promise<SandboxEnvironment> => {
    try {
      const response = await fetch('/api/sandboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startupScript })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create sandbox')
      }
      
      const apiResponse = await response.json()
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error || 'Failed to create sandbox')
      }
      
      const sandboxData = apiResponse.data
      const newSandbox: SandboxEnvironment = {
        ...sandboxData,
        createdAt: new Date(sandboxData.createdAt),
        lastActivity: new Date(sandboxData.lastActivity),
        metrics: {
          ...sandboxData.metrics,
          p99CommandTime: sandboxData.metrics.p99CommandTime || 0,
          memoryUsage: Math.random() * 100,
          cpuUsage: Math.random() * 100
        },
        processes: [],
        exposedPorts: [],
        files: []
      }

      setSandboxes(prev => [...prev, newSandbox])
      return newSandbox
    } catch (error) {
      console.error('Failed to create sandbox:', error)
      throw error
    }
  }, [])

  const deleteSandbox = useCallback(async (id: string): Promise<void> => {
    try {
      await fetch(`/api/sandboxes/${id}`, { method: 'DELETE' })
      setSandboxes(prev => prev.filter(sb => sb.id !== id))
      if (selectedSandbox?.id === id) {
        setSelectedSandbox(null)
      }
    } catch (error) {
      console.error('Failed to delete sandbox:', error)
      throw error
    }
  }, [selectedSandbox])

  const selectSandbox = useCallback((sandbox: SandboxEnvironment | null) => {
    setSelectedSandbox(sandbox)
  }, [])

  const executeCommand = useCallback(async (sandboxId: string, command: string): Promise<CommandResult> => {
    try {
      const response = await fetch(`/api/sandboxes/${sandboxId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      })
      
      if (!response.ok) {
        throw new Error('Failed to execute command')
      }
      
      const apiResponse = await response.json()
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error || 'Failed to execute command')
      }
      
      const result = apiResponse.data
      const commandResult: CommandResult = {
        ...result,
        timestamp: new Date(result.timestamp)
      }

      setCommandHistory(prev => [commandResult, ...prev].slice(0, 100))
      
      // Update sandbox metrics
      setSandboxes(prev => prev.map(sb => {
        if (sb.id === sandboxId) {
          return {
            ...sb,
            lastActivity: new Date(),
            metrics: {
              ...sb.metrics,
              totalCommands: sb.metrics.totalCommands + 1,
              avgCommandTime: result.executionTime
            }
          }
        }
        return sb
      }))

      return commandResult
    } catch (error) {
      console.error('Failed to execute command:', error)
      throw error
    }
  }, [])

  const streamCommand = useCallback(async (sandboxId: string, command: string, onData: (data: string) => void): Promise<void> => {
    try {
      const response = await fetch(`/api/sandboxes/${sandboxId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      })
      
      if (!response.ok) {
        throw new Error('Failed to start streaming command')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body for streaming')
      }

      const decoder = new TextDecoder()
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6)
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.stream && parsed.data) {
                    onData(parsed.data)
                  } else if (parsed.error) {
                    onData(`Error: ${parsed.error}\n`)
                  }
                } catch {
                  // Ignore parsing errors for malformed SSE data
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error('Failed to stream command:', error)
      throw error
    }
  }, [])

  const saveStartupScript = useCallback(async (script: StartupScript) => {
    try {
      const isUpdate = startupScripts.some(s => s.id === script.id)
      const method = isUpdate ? 'PUT' : 'POST'
      const url = isUpdate ? `/api/startup-scripts/${script.id}` : '/api/startup-scripts'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: script.name,
          content: script.content,
          description: script.description
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save startup script')
      }
      
      const apiResponse = await response.json()
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error || 'Failed to save startup script')
      }
      
      const savedScript = {
        ...apiResponse.data,
        createdAt: new Date(apiResponse.data.createdAt),
        lastUsed: apiResponse.data.lastUsed ? new Date(apiResponse.data.lastUsed) : undefined
      }
      
      setStartupScripts(prev => {
        const existing = prev.find(s => s.id === savedScript.id)
        if (existing) {
          return prev.map(s => s.id === savedScript.id ? savedScript : s)
        }
        return [...prev, savedScript]
      })
      
      return savedScript
    } catch (error) {
      console.error('Failed to save startup script:', error)
      throw error
    }
  }, [startupScripts])

  const updateSandboxMetrics = useCallback((sandboxId: string) => {
    setSandboxes(prev => prev.map(sb => {
      if (sb.id === sandboxId) {
        return {
          ...sb,
          metrics: {
            ...sb.metrics,
            uptime: Date.now() - sb.createdAt.getTime(),
            memoryUsage: Math.random() * 100,
            cpuUsage: Math.random() * 100
          }
        }
      }
      return sb
    }))
  }, [])

  const pingSandbox = useCallback(async (sandboxId: string) => {
    try {
      const response = await fetch(`/api/sandboxes/${sandboxId}/ping`)
      
      if (!response.ok) {
        // If ping fails, mark sandbox as error
        setSandboxes(prev => prev.map(sb => 
          sb.id === sandboxId ? { ...sb, status: 'error' } : sb
        ))
        throw new Error(`Ping failed with status ${response.status}`)
      }
      
      const apiResponse = await response.json()
      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.error || 'Ping failed')
      }
      
      // Update sandbox status based on ping result
      setSandboxes(prev => prev.map(sb => 
        sb.id === sandboxId ? { 
          ...sb, 
          status: apiResponse.data.status,
          lastActivity: new Date()
        } : sb
      ))
      
      return apiResponse.data
    } catch (error) {
      console.error(`Failed to ping sandbox ${sandboxId}:`, error)
      // Mark sandbox as error state
      setSandboxes(prev => prev.map(sb => 
        sb.id === sandboxId ? { ...sb, status: 'error' } : sb
      ))
      throw error
    }
  }, [])

  // Terminal history management functions
  const getTerminalHistory = useCallback((sandboxId: string): TerminalEntry[] => {
    const history = terminalHistories.get(sandboxId)
    if (!history) {
      // Initialize with welcome message for new sandboxes
      const sandbox = sandboxes.find(sb => sb.id === sandboxId)
      const welcomeEntry: TerminalEntry = {
        id: 'welcome',
        type: 'system',
        content: `Welcome to ${sandbox?.name || 'sandbox'} environment.\nType 'help' to see available commands.`,
        timestamp: new Date()
      }
      const initialHistory = [welcomeEntry]
      setTerminalHistories(prev => new Map(prev).set(sandboxId, initialHistory))
      return initialHistory
    }
    return history
  }, [terminalHistories, sandboxes])

  const addTerminalEntry = useCallback((sandboxId: string, entry: TerminalEntry) => {
    setTerminalHistories(prev => {
      const newMap = new Map(prev)
      const currentHistory = newMap.get(sandboxId) || []
      newMap.set(sandboxId, [...currentHistory, entry])
      return newMap
    })
  }, [])

  const clearTerminalHistory = useCallback((sandboxId: string) => {
    setTerminalHistories(prev => {
      const newMap = new Map(prev)
      newMap.delete(sandboxId)
      return newMap
    })
  }, [])

  // Load sandboxes on mount
  useEffect(() => {
    const loadSandboxes = async () => {
      try {
        const response = await fetch('/api/sandboxes')
        if (response.ok) {
          const apiResponse = await response.json()
          if (apiResponse.success && Array.isArray(apiResponse.data)) {
            const loadedSandboxes = await Promise.all(
              apiResponse.data.map(async (sb: SandboxEnvironment) => {
                let processes: any[] = []
                
                // Load processes for running sandboxes
                if (sb.status === 'running') {
                  try {
                    const processResponse = await fetch(`/api/sandboxes/${sb.id}/processes`)
                    if (processResponse.ok) {
                      const processApiResponse = await processResponse.json()
                      if (processApiResponse.success && Array.isArray(processApiResponse.data)) {
                        processes = processApiResponse.data.map((proc: any) => ({
                          id: proc.id,
                          command: proc.command,
                          pid: proc.pid,
                          status: proc.status,
                          startTime: new Date(proc.startTime),
                          logs: proc.logs || []
                        }))
                      }
                    }
                  } catch (error) {
                    console.error(`Failed to load processes for sandbox ${sb.id}:`, error)
                  }
                }
                
                return {
                  ...sb,
                  createdAt: new Date(sb.createdAt),
                  lastActivity: new Date(sb.lastActivity),
                  metrics: {
                    ...sb.metrics,
                    p99CommandTime: sb.metrics?.p99CommandTime || 0,
                    memoryUsage: Math.random() * 100,
                    cpuUsage: Math.random() * 100
                  },
                  processes,
                  exposedPorts: sb.exposedPorts || [],
                  files: sb.files || []
                }
              })
            )
            setSandboxes(loadedSandboxes)
          }
        }
      } catch (error) {
        console.error('Failed to load sandboxes:', error)
      }
    }
    
    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/metrics')
        if (response.ok) {
          const apiResponse = await response.json()
          if (apiResponse.success && apiResponse.data) {
            setGlobalMetrics(apiResponse.data)
          }
        }
      } catch (error) {
        console.error('Failed to load metrics:', error)
      }
    }

    const loadStartupScripts = async () => {
      try {
        const response = await fetch('/api/startup-scripts')
        if (response.ok) {
          const apiResponse = await response.json()
          if (apiResponse.success && Array.isArray(apiResponse.data)) {
            const loadedScripts = apiResponse.data.map((script: any) => ({
              ...script,
              createdAt: new Date(script.createdAt),
              lastUsed: script.lastUsed ? new Date(script.lastUsed) : undefined
            }))
            setStartupScripts(loadedScripts)
          }
        }
      } catch (error) {
        console.error('Failed to load startup scripts:', error)
      }
    }

    loadSandboxes()
    loadMetrics()
    loadStartupScripts()
    
    // Refresh sandbox data every 30 seconds to keep process counts updated
    const interval = setInterval(loadSandboxes, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      sandboxes.forEach(sb => {
        if (sb.status === 'running') {
          updateSandboxMetrics(sb.id)
        }
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [sandboxes, updateSandboxMetrics])

  // Periodic health checks for all running sandboxes
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      const runningSandboxes = sandboxes.filter(sb => sb.status === 'running')
      
      // Ping each running sandbox
      for (const sandbox of runningSandboxes) {
        try {
          await pingSandbox(sandbox.id)
        } catch (error) {
          console.warn(`Health check failed for sandbox ${sandbox.id}:`, error)
          // Error handling is already done in pingSandbox function
        }
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(healthCheckInterval)
  }, [sandboxes, pingSandbox])

  const value: SandboxContextType = {
    sandboxes,
    selectedSandbox,
    globalMetrics,
    startupScripts,
    commandHistory,
    createSandbox,
    deleteSandbox,
    selectSandbox,
    executeCommand,
    streamCommand,
    saveStartupScript,
    updateSandboxMetrics,
    pingSandbox,
    getTerminalHistory,
    addTerminalEntry,
    clearTerminalHistory
  }

  return (
    <SandboxContext.Provider value={value}>
      {children}
    </SandboxContext.Provider>
  )
}

export function useSandbox() {
  const context = useContext(SandboxContext)
  if (context === undefined) {
    throw new Error('useSandbox must be used within a SandboxProvider')
  }
  return context
}