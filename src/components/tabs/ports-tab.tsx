import { useState, useEffect } from 'react'
import { Globe, Plus, Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { SandboxEnvironment } from '@/types/sandbox'

interface PortsTabProps {
  sandbox: SandboxEnvironment
}

interface ExposedPort {
  port: number
  previewUrl: string
  protocol: 'http' | 'https'
  status: 'active' | 'inactive'
  name?: string
}

export function PortsTab({ sandbox }: PortsTabProps) {
  const [exposedPorts, setExposedPorts] = useState<ExposedPort[]>([])
  const [isExposeOpen, setIsExposeOpen] = useState(false)
  const [newPort, setNewPort] = useState('')
  const [newPortName, setNewPortName] = useState('')
  const [isExposing, setIsExposing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadExposedPorts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sandboxes/${sandbox.id}/ports`)
      
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success && Array.isArray(apiResponse.data)) {
          setExposedPorts(apiResponse.data)
        }
      }
    } catch (error) {
      console.error('Failed to load exposed ports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExposedPorts()
  }, [sandbox.id])

  const handleExposePort = async () => {
    const port = parseInt(newPort)
    if (!port || port < 1 || port > 65535) return
    
    setIsExposing(true)
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/ports/expose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port,
          name: newPortName.trim() || undefined
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to expose port')
      }
      
      const apiResponse = await response.json()
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to expose port')
      }
      
      // Reload ports after successful exposure
      await loadExposedPorts()
      
      setNewPort('')
      setNewPortName('')
      setIsExposeOpen(false)
      
    } catch (error) {
      console.error('Failed to expose port:', error)
      // You might want to show an error message to the user
    } finally {
      setIsExposing(false)
    }
  }

  const handleUnexposePort = async (port: number) => {
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/ports/${port}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to unexpose port')
      }
      
      const apiResponse = await response.json()
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to unexpose port')
      }
      
      // Reload ports after successful removal
      await loadExposedPorts()
      
    } catch (error) {
      console.error('Failed to unexpose port:', error)
      // You might want to show an error message to the user
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Globe className="h-6 w-6 text-primary" />
            Port Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Expose services running in your sandbox to the internet with public URLs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadExposedPorts} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isExposeOpen} onOpenChange={setIsExposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Expose Port
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Expose New Port</DialogTitle>
                <DialogDescription>
                  Expose a port from your sandbox to create a public preview URL
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="port-number">Port Number *</Label>
                  <Input
                    id="port-number"
                    type="number"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    placeholder="3000"
                    min="1"
                    max="65535"
                  />
                </div>
                <div>
                  <Label htmlFor="port-name">Service Name (Optional)</Label>
                  <Input
                    id="port-name"
                    value={newPortName}
                    onChange={(e) => setNewPortName(e.target.value)}
                    placeholder="e.g., Web Server, API"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsExposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleExposePort} disabled={isExposing}>
                    {isExposing ? 'Exposing...' : 'Expose Port'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Exposed Ports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exposed Ports ({exposedPorts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading ports...</span>
            </div>
          ) : exposedPorts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No ports exposed</h3>
              <p className="text-sm mb-4">
                Expose a port to make your sandbox services accessible via public URLs
              </p>
              <Button onClick={() => setIsExposeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Expose Your First Port
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {exposedPorts.map((exposedPort) => (
                <div key={exposedPort.port} className="border rounded-lg p-4 hover:border-primary/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-lg">Port {exposedPort.port}</span>
                        <Badge className={getStatusColor(exposedPort.status)}>
                          {exposedPort.status}
                        </Badge>
                        {exposedPort.protocol && (
                          <Badge variant="outline" className="text-xs">
                            {exposedPort.protocol.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      
                      {exposedPort.name && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {exposedPort.name}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded text-xs">
                          {exposedPort.previewUrl}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(exposedPort.previewUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleUnexposePort(exposedPort.port)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Port Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Port Exposure Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Preview URLs:</strong> Each exposed port gets a unique public URL that routes directly to your sandbox service.
            </p>
            <p>
              <strong>Automatic Routing:</strong> The system handles all request forwarding, headers, and networking automatically.
            </p>
            <p>
              <strong>Security:</strong> Only explicitly exposed ports are accessible from the internet.
            </p>
          </div>
          
          <Separator />
          
          <div className="text-sm">
            <h4 className="font-medium mb-2">Common Ports:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><code>3000</code> - React/Node.js</div>
              <div><code>8080</code> - HTTP servers</div>
              <div><code>5000</code> - Flask/Python</div>
              <div><code>4000</code> - Ruby/Rails</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}