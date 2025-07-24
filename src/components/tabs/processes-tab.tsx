import { useState, useEffect } from 'react'
import { Play, Square, ExternalLink, Eye, EyeOff, Plus, Terminal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')

  const processTemplates = [
    {
      id: 'custom',
      name: 'Custom Command',
      description: 'Enter your own command',
      command: ''
    },
    {
      id: 'node-server',
      name: 'Node.js Server',
      description: 'Start a Node.js HTTP server on port 3000',
      command: 'node -e "const http = require(\'http\'); const server = http.createServer((req, res) => { res.writeHead(200, {\'Content-Type\': \'application/json\'}); res.end(JSON.stringify({message: \'Hello from Node.js!\', timestamp: new Date().toISOString()})); }); server.listen(3000, () => console.log(\'Server running on port 3000\'))"'
    },
    {
      id: 'python-server',
      name: 'Python HTTP Server',
      description: 'Start a Python HTTP server on port 8000',
      command: 'python3 -m http.server 8000'
    },
    {
      id: 'npm-dev',
      name: 'npm run dev',
      description: 'Start development server with npm',
      command: 'npm run dev'
    },
    {
      id: 'npm-start',
      name: 'npm start',
      description: 'Start application with npm',
      command: 'npm start'
    },
    {
      id: 'watch-logs',
      name: 'Watch System Logs',
      description: 'Monitor system logs in real-time',
      command: 'tail -f /var/log/syslog || journalctl -f || echo "No system logs available"'
    },
    {
      id: 'file-server',
      name: 'File Server',
      description: 'Serve current directory on port 8080',
      command: 'python3 -m http.server 8080 || python -m SimpleHTTPServer 8080'
    }
  ]

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load processes
        const processResponse = await fetch(`/api/sandboxes/${sandbox.id}/processes`)
        if (processResponse.ok) {
          const apiResponse = await processResponse.json()
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
        
        // Load exposed ports
        const portsResponse = await fetch(`/api/sandboxes/${sandbox.id}/ports`)
        if (portsResponse.ok) {
          const portsApiResponse = await portsResponse.json()
          if (portsApiResponse.success && Array.isArray(portsApiResponse.data)) {
            const ports: ExposedPort[] = portsApiResponse.data.map((port: { port: number; url: string }) => ({
              port: port.port,
              previewUrl: port.url,
              protocol: 'https',
              status: 'active'
            }))
            setExposedPorts(ports)
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setProcesses([])
        setExposedPorts([])
      }
    }

    loadData()
  }, [sandbox.id])

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = processTemplates.find(t => t.id === templateId)
    if (template) {
      setNewProcessCommand(template.command)
    }
  }

  const handleStartProcess = async () => {
    if (!newProcessCommand.trim()) return
    
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/processes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: newProcessCommand })
      })
      
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success && apiResponse.data) {
          const newProcess: RunningProcess = {
            id: apiResponse.data.id,
            command: apiResponse.data.command,
            pid: apiResponse.data.pid,
            status: apiResponse.data.status,
            startTime: new Date(apiResponse.data.startTime),
            logs: []
          }
          
          setProcesses(prev => [...prev, newProcess])
          setNewProcessCommand('')
          setSelectedTemplate('custom')
          setIsStartProcessOpen(false)
          
          // Refresh processes list to get updated data
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      }
    } catch (error) {
      console.error('Failed to start process:', error)
    }
  }

  const handleExposePort = async () => {
    const portNum = parseInt(newPortNumber)
    if (!portNum || portNum < 1 || portNum > 65535) return
    
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/ports/expose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum })
      })
      
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success && apiResponse.data) {
          const newPort: ExposedPort = {
            port: apiResponse.data.port,
            previewUrl: apiResponse.data.url,
            protocol: 'https',
            status: 'active'
          }
          
          setExposedPorts(prev => [...prev, newPort])
          setNewPortNumber('')
          setIsExposePortOpen(false)
        }
      }
    } catch (error) {
      console.error('Failed to expose port:', error)
    }
  }

  const handleStopProcess = async (processId: string) => {
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/processes/${processId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setProcesses(prev => prev.filter(p => p.id !== processId))
      } else {
        console.error('Failed to stop process')
      }
    } catch (error) {
      console.error('Failed to stop process:', error)
    }
  }

  const toggleLogs = async (processId: string) => {
    const isCurrentlyShown = showLogs[processId]
    
    setShowLogs(prev => ({
      ...prev,
      [processId]: !prev[processId]
    }))
    
    // If we're showing logs for the first time, fetch them
    if (!isCurrentlyShown) {
      try {
        const response = await fetch(`/api/sandboxes/${sandbox.id}/processes/${processId}/logs`)
        if (response.ok) {
          const apiResponse = await response.json()
          if (apiResponse.success && Array.isArray(apiResponse.data)) {
            setProcesses(prev => prev.map(process => 
              process.id === processId 
                ? { ...process, logs: apiResponse.data }
                : process
            ))
          }
        }
      } catch (error) {
        console.error('Failed to load process logs:', error)
      }
    }
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 flex-shrink-0">
        <h2 className="text-xl font-semibold">Process Management</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isStartProcessOpen} onOpenChange={setIsStartProcessOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Start Process
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Start New Process</DialogTitle>
                <DialogDescription>
                  Choose a template or enter a custom command to start a background process
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Process Template</label>
                  <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {processTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center space-x-2">
                            <Terminal className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">{template.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Command</label>
                  <Input
                    value={newProcessCommand}
                    onChange={(e) => setNewProcessCommand(e.target.value)}
                    placeholder="e.g., node server.js, npm start, python app.py"
                    className="font-mono text-sm"
                  />
                </div>
                
                {selectedTemplate !== 'custom' && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <strong>Template:</strong> {processTemplates.find(t => t.id === selectedTemplate)?.description}
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsStartProcessOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartProcess} disabled={!newProcessCommand.trim()}>
                    <Play className="h-4 w-4 mr-1" />
                    Start Process
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
      
      <div className="flex-1">
        <ScrollArea className="h-full">
          <div className="p-6 pt-0 space-y-6">
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
                        title="Kill Process"
                      >
                        <Square className="h-3 w-3" />
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
        </ScrollArea>
      </div>
    </div>
  )
}