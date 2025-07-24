import { useState, useEffect } from 'react'
import { Play, Square, Trash2, ExternalLink, Eye, EyeOff, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { SandboxEnvironment, RunningProcess, ExposedPort, ProcessApiResponse } from '@/types/sandbox'
import { cn } from '@/lib/utils'

interface ProcessesTabProps {
  sandbox: SandboxEnvironment
}

export function ProcessesTab({ sandbox }: ProcessesTabProps) {
  const [processes, setProcesses] = useState<RunningProcess[]>([])
  const [exposedPorts, setExposedPorts] = useState<ExposedPort[]>([])
  const [showLogs, setShowLogs] = useState<Record<string, boolean>>({})
  const [isStartProcessOpen, setIsStartProcessOpen] = useState(false)
  const [isExposePortOpen, setIsExposePortOpen] = useState(false)
  const [newProcessCommand, setNewProcessCommand] = useState('')
  const [newPortNumber, setNewPortNumber] = useState('')

  useEffect(() => {
    const loadProcesses = async () => {
      try {
        const response = await fetch(`/api/sandboxes/${sandbox.id}/processes`)
        if (response.ok) {
          const apiResponse = await response.json()
          if (apiResponse.success && Array.isArray(apiResponse.data)) {
            const processesWithLogs: RunningProcess[] = apiResponse.data.map((proc: ProcessApiResponse) => ({
              id: proc.id,
              command: proc.command,
              pid: proc.pid,
              status: proc.status,
              startTime: new Date(proc.startTime),
              logs: proc.logs || []
            }))
            setProcesses(processesWithLogs)
          } else {
            console.error('Failed to load processes:', apiResponse.error)
            setProcesses([])
          }
        }
      } catch (error) {
        console.error('Failed to load processes:', error)
        setProcesses([])
      }
    }

    loadProcesses()
  }, [sandbox.id])

  const handleStartProcess = async () => {
    if (!newProcessCommand.trim()) return
    
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/processes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: newProcessCommand })
      })
      
      if (response.ok) {
        const processData = await response.json()
        const newProcess: RunningProcess = {
          id: processData.id,
          command: processData.command,
          pid: processData.pid,
          status: processData.status,
          startTime: new Date(processData.startTime),
          logs: []
        }
        
        setProcesses(prev => [...prev, newProcess])
        setNewProcessCommand('')
        setIsStartProcessOpen(false)
      }
    } catch (error) {
      console.error('Failed to start process:', error)
    }
  }

  const handleExposePort = async () => {
    const portNum = parseInt(newPortNumber)
    if (!portNum || portNum < 1 || portNum > 65535) return
    
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/expose-port`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum })
      })
      
      if (response.ok) {
        const portData = await response.json()
        const newPort: ExposedPort = {
          port: portData.port,
          previewUrl: portData.url,
          protocol: 'https',
          status: 'active'
        }
        
        setExposedPorts(prev => [...prev, newPort])
        setNewPortNumber('')
        setIsExposePortOpen(false)
      }
    } catch (error) {
      console.error('Failed to expose port:', error)
    }
  }

  const handleStopProcess = (processId: string) => {
    setProcesses(prev => prev.filter(p => p.id !== processId))
  }

  const toggleLogs = (processId: string) => {
    setShowLogs(prev => ({
      ...prev,
      [processId]: !prev[processId]
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'stopped': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500'
      case 'warn': return 'text-yellow-500'
      case 'info': return 'text-blue-500'
      case 'debug': return 'text-gray-500'
      default: return 'text-foreground'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Process Management</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isStartProcessOpen} onOpenChange={setIsStartProcessOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Start Process
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Process</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Command</label>
                  <Input
                    value={newProcessCommand}
                    onChange={(e) => setNewProcessCommand(e.target.value)}
                    placeholder="e.g., node server.js, npm start, python app.py"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsStartProcessOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartProcess}>
                    Start
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isExposePortOpen} onOpenChange={setIsExposePortOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-1" />
                Expose Port
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Expose Port</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Port Number</label>
                  <Input
                    type="number"
                    value={newPortNumber}
                    onChange={(e) => setNewPortNumber(e.target.value)}
                    placeholder="e.g., 3000, 8080"
                    min="1"
                    max="65535"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsExposePortOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleExposePort}>
                    Expose
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Running Processes */}
      <Card>
        <CardHeader>
          <CardTitle>Running Processes ({processes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No processes running</p>
              <p className="text-sm mt-1">Start a process to see it here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {processes.map((process) => (
                <div key={process.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(process.status))} />
                      <div>
                        <div className="font-mono text-sm font-medium">{process.command}</div>
                        <div className="text-xs text-muted-foreground">
                          PID: {process.pid} | Started: {process.startTime.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={process.status === 'running' ? 'default' : 'secondary'}>
                        {process.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleLogs(process.id)}
                      >
                        {showLogs[process.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStopProcess(process.id)}
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStopProcess(process.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {showLogs[process.id] && (
                    <>
                      <Separator className="my-3" />
                      <div>
                        <h4 className="text-sm font-medium mb-2">Process Logs</h4>
                        <ScrollArea className="h-40 border rounded p-2">
                          <div className="space-y-1 font-mono text-xs">
                            {process.logs.map((log) => (
                              <div key={log.id} className="flex items-start space-x-2">
                                <span className="text-muted-foreground min-w-[60px]">
                                  {log.timestamp.toLocaleTimeString().slice(0, 8)}
                                </span>
                                <span className={cn("min-w-[50px]", getLogLevelColor(log.level))}>
                                  [{log.level.toUpperCase()}]
                                </span>
                                <span className="flex-1">{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exposed Ports */}
      <Card>
        <CardHeader>
          <CardTitle>Exposed Ports ({exposedPorts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {exposedPorts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ports exposed</p>
              <p className="text-sm mt-1">Expose a port to make your service accessible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exposedPorts.map((port) => (
                <div key={port.port} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-semibold">Port {port.port}</span>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Preview URL:</span>
                      <div className="font-mono text-xs bg-muted p-2 rounded mt-1">
                        {port.previewUrl}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={port.previewUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        navigator.clipboard.writeText(port.previewUrl)
                      }}>
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}