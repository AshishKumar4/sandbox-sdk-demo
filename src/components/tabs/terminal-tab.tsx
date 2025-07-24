import { useState, useRef, useEffect } from 'react'
import { Send, Terminal, History, Trash2, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useSandbox } from '@/contexts/sandbox-context'
import type { SandboxEnvironment } from '@/types/sandbox'
import { cn } from '@/lib/utils'

interface TerminalTabProps {
  sandbox: SandboxEnvironment
}

interface TerminalEntry {
  id: string
  type: 'command' | 'output' | 'error' | 'system'
  content: string
  timestamp: Date
  executionTime?: number
}

interface CommandStats {
  command: string
  count: number
  totalTime: number
  avgTime: number
}

export function TerminalTab({ sandbox }: TerminalTabProps) {
  const { executeCommand, streamCommand, commandHistory, getTerminalHistory, addTerminalEntry, clearTerminalHistory } = useSandbox()
  const [currentCommand, setCurrentCommand] = useState('')
  const terminalHistory = getTerminalHistory(sandbox.id)
  const [isExecuting, setIsExecuting] = useState(false)
  const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const recentCommands = commandHistory
    .filter(cmd => cmd.command.trim())
    .slice(0, 5) // Shortened to 5 commands
    .map(cmd => cmd.command)
    
  // Calculate command statistics
  const commandStats: CommandStats[] = commandHistory
    .filter(cmd => cmd.command.trim() && cmd.executionTime)
    .reduce((acc, cmd) => {
      const baseCommand = cmd.command.trim().split(' ')[0] // Get base command (git, npm, etc.)
      const existing = acc.find(stat => stat.command === baseCommand)
      
      if (existing) {
        existing.count++
        existing.totalTime += cmd.executionTime!
        existing.avgTime = existing.totalTime / existing.count
      } else {
        acc.push({
          command: baseCommand,
          count: 1,
          totalTime: cmd.executionTime!,
          avgTime: cmd.executionTime!
        })
      }
      
      return acc
    }, [] as CommandStats[])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8) // Top 8 most used commands

  useEffect(() => {
    if (scrollRef.current) {
      // ScrollArea has a viewport div inside it
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [terminalHistory])

  const addToTerminal = (entry: Omit<TerminalEntry, 'id' | 'timestamp'>) => {
    const newEntry: TerminalEntry = {
      ...entry,
      id: `entry-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }
    addTerminalEntry(sandbox.id, newEntry)
  }

  const executeCmd = async (command: string) => {
    if (!command.trim()) return

    // Add command to terminal
    addToTerminal({
      type: 'command',
      content: `$ ${command}`
    })

    setIsExecuting(true)
    
    try {
      // Handle built-in commands
      if (command.trim() === 'clear') {
        clearTerminalHistory(sandbox.id)
        addTerminalEntry(sandbox.id, {
          id: 'cleared',
          type: 'system',
          content: 'Terminal cleared.',
          timestamp: new Date()
        })
        return
      }
      
      if (command.trim() === 'help') {
        addToTerminal({
          type: 'system',
          content: `Available commands:
  clear - Clear the terminal
  help - Show this help message
  ls - List files and directories
  pwd - Show current directory
  echo <text> - Echo text
  node -v - Show Node.js version
  npm -v - Show npm version
  git --version - Show git version
  curl <url> - Make HTTP request
  
You can run any standard Linux command in this sandbox environment.`
        })
        return
      }
      
      // Handle streaming commands (like npm install, git clone, etc.)
      const streamingCommands = ['npm install', 'git clone', 'docker build', 'yarn install', 'pip install', 'cargo build']
      const isStreamingCommand = streamingCommands.some(cmd => command.includes(cmd))
      
      const startTime = Date.now()
      
      if (isStreamingCommand) {
        let output = ''
        const outputEntryId = `output-${Date.now()}`
        
        try {
          await streamCommand(sandbox.id, command, (data) => {
            output += data
            
            // Get current history and update or add output entry
            const currentHistory = getTerminalHistory(sandbox.id)
            const lastEntry = currentHistory[currentHistory.length - 1]
            
            if (lastEntry && lastEntry.type === 'output' && lastEntry.id === outputEntryId) {
              // Update existing output entry content
              lastEntry.content = output
            } else {
              // Add new output entry
              addTerminalEntry(sandbox.id, {
                id: outputEntryId,
                type: 'output',
                content: output,
                timestamp: new Date()
              })
            }
          })
          
          // Add execution time for streaming commands
          const executionTime = Date.now() - startTime
          addToTerminal({
            type: 'system',
            content: `Command completed in ${executionTime.toFixed(0)}ms`,
            executionTime
          })
        } catch (error) {
          const executionTime = Date.now() - startTime
          addToTerminal({
            type: 'error',
            content: `Streaming command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            executionTime
          })
        }
      } else {
        // Regular command execution
        const result = await executeCommand(sandbox.id, command)
        
        if (result.stdout) {
          addToTerminal({
            type: 'output',
            content: result.stdout,
            executionTime: result.executionTime
          })
        }
        
        if (result.stderr) {
          addToTerminal({
            type: 'error',
            content: result.stderr,
            executionTime: result.executionTime
          })
        }
        
        if (result.exitCode !== 0) {
          addToTerminal({
            type: 'error',
            content: `Command exited with code ${result.exitCode}`,
            executionTime: result.executionTime
          })
        }
        
        // Always show execution time for regular commands
        if (!result.stdout && !result.stderr) {
          addToTerminal({
            type: 'system',
            content: `Command executed in ${result.executionTime.toFixed(0)}ms`,
            executionTime: result.executionTime
          })
        }
      }
    } catch (error) {
      addToTerminal({
        type: 'error',
        content: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentCommand.trim() || isExecuting) return
    
    const command = currentCommand
    setCurrentCommand('')
    setCommandHistoryIndex(-1)
    await executeCmd(command)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (recentCommands.length > 0) {
        const newIndex = Math.min(commandHistoryIndex + 1, recentCommands.length - 1)
        setCommandHistoryIndex(newIndex)
        setCurrentCommand(recentCommands[newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIndex = Math.max(commandHistoryIndex - 1, -1)
      setCommandHistoryIndex(newIndex)
      setCurrentCommand(newIndex >= 0 ? recentCommands[newIndex] || '' : '')
    }
  }

  const clearTerminal = () => {
    clearTerminalHistory(sandbox.id)
    addTerminalEntry(sandbox.id, {
      id: 'cleared',
      type: 'system',
      content: 'Terminal cleared.',
      timestamp: new Date()
    })
  }

  const getEntryColor = (type: string) => {
    switch (type) {
      case 'command': return 'text-primary font-semibold'
      case 'output': return 'text-foreground'
      case 'error': return 'text-red-500'
      case 'system': return 'text-blue-500'
      default: return 'text-foreground'
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0 p-6 pb-4">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5" />
          <span className="font-medium">Interactive Terminal</span>
          <Badge variant="secondary">
            {sandbox.status === 'running' ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearTerminal}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 flex space-x-4 px-6 pb-6 min-h-0">
        <Card className="flex-1 flex flex-col">
          <CardContent className="p-0 h-full flex flex-col">
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="p-4 space-y-2 font-mono text-sm">
                {terminalHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start space-x-2">
                    <span className="text-muted-foreground text-xs mt-1 min-w-[60px]">
                      {entry.timestamp.toLocaleTimeString().slice(0, 5)}
                    </span>
                    <div className="flex-1">
                      <pre className={cn(
                        "whitespace-pre-wrap break-words",
                        getEntryColor(entry.type)
                      )}>
                        {entry.content}
                      </pre>
                      {entry.executionTime && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Executed in {entry.executionTime.toFixed(0)}ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isExecuting && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                    <span className="text-sm">Executing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="border-t p-4 flex-shrink-0">
              <form onSubmit={handleSubmit}>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground font-mono text-sm">$</span>
                  <Input
                    ref={inputRef}
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command..."
                    className="flex-1 font-mono"
                    disabled={isExecuting || sandbox.status !== 'running'}
                  />
                  <Button type="submit" disabled={isExecuting || sandbox.status !== 'running'}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <div className="w-80 flex flex-col space-y-4 h-full">
          {/* Command History */}
          <Card className="h-48 flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <History className="h-4 w-4" />
                <span>Recent Commands</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {recentCommands.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No commands yet</p>
                  ) : (
                    recentCommands.map((cmd, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentCommand(cmd)}
                        className="w-full text-left p-2 text-xs font-mono bg-muted rounded hover:bg-muted/80 transition-colors truncate"
                        title={cmd}
                      >
                        {cmd}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Command Analytics */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Activity className="h-4 w-4" />
                <span>Command Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {commandStats.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No analytics yet</p>
                  ) : (
                    commandStats.map((stat, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono font-medium truncate">{stat.command}</div>
                          <div className="text-muted-foreground">
                            {stat.count} use{stat.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-medium">
                            {stat.avgTime < 1000 
                              ? `${stat.avgTime.toFixed(0)}ms` 
                              : `${(stat.avgTime / 1000).toFixed(1)}s`
                            }
                          </div>
                          <div className="text-muted-foreground text-xs">avg</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}