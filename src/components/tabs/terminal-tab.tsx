import { useState, useRef, useEffect } from 'react'
import { Send, Terminal, History, Trash2 } from 'lucide-react'
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

export function TerminalTab({ sandbox }: TerminalTabProps) {
  const { executeCommand, streamCommand, commandHistory } = useSandbox()
  const [currentCommand, setCurrentCommand] = useState('')
  const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([
    {
      id: 'welcome',
      type: 'system',
      content: `Welcome to ${sandbox.name} sandbox environment.\nType 'help' to see available commands.`,
      timestamp: new Date()
    }
  ])
  const [isExecuting, setIsExecuting] = useState(false)
  const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const recentCommands = commandHistory
    .filter(cmd => cmd.command.trim())
    .slice(0, 10)
    .map(cmd => cmd.command)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [terminalHistory])

  const addToTerminal = (entry: Omit<TerminalEntry, 'id' | 'timestamp'>) => {
    const newEntry: TerminalEntry = {
      ...entry,
      id: `entry-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }
    setTerminalHistory(prev => [...prev, newEntry])
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
        setTerminalHistory([{
          id: 'cleared',
          type: 'system',
          content: 'Terminal cleared.',
          timestamp: new Date()
        }])
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
      const streamingCommands = ['npm install', 'git clone', 'docker build', 'yarn install']
      const isStreamingCommand = streamingCommands.some(cmd => command.includes(cmd))
      
      if (isStreamingCommand) {
        let output = ''
        await streamCommand(sandbox.id, command, (data) => {
          output += data
          // Update the last entry if it's output, otherwise add new
          setTerminalHistory(prev => {
            const lastEntry = prev[prev.length - 1]
            if (lastEntry && lastEntry.type === 'output') {
              return [
                ...prev.slice(0, -1),
                { ...lastEntry, content: output }
              ]
            } else {
              return [...prev, {
                id: `output-${Date.now()}`,
                type: 'output' as const,
                content: output,
                timestamp: new Date()
              }]
            }
          })
        })
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
            content: result.stderr
          })
        }
        
        if (result.exitCode !== 0) {
          addToTerminal({
            type: 'error',
            content: `Command exited with code ${result.exitCode}`
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
    setTerminalHistory([{
      id: 'cleared',
      type: 'system',
      content: 'Terminal cleared.',
      timestamp: new Date()
    }])
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
    <div className="flex flex-col h-full p-6 space-y-4">
      <div className="flex items-center justify-between">
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

      <div className="flex-1 flex space-x-4">
        <Card className="flex-1">
          <CardContent className="p-0 h-full flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-2 font-mono text-sm">
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
            
            <form onSubmit={handleSubmit} className="border-t p-4">
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
          </CardContent>
        </Card>

        <Card className="w-80">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-sm">
              <History className="h-4 w-4" />
              <span>Command History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentCommands.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commands yet</p>
            ) : (
              recentCommands.map((cmd, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentCommand(cmd)}
                  className="w-full text-left p-2 text-sm font-mono bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  {cmd}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}