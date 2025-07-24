import { useState } from 'react'
import { Plus, Server, Trash2, Code } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSandbox } from '@/contexts/sandbox-context'
import { cn } from '@/lib/utils'

type AppView = 'sandboxes' | 'startup-scripts'

interface AppSidebarProps {
  currentView: AppView
  onViewChange: (view: AppView) => void
}

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { sandboxes, selectedSandbox, selectSandbox, createSandbox, deleteSandbox, startupScripts } = useSandbox()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newSandboxName, setNewSandboxName] = useState('')
  const [selectedStartupScript, setSelectedStartupScript] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateSandbox = async () => {
    if (!newSandboxName.trim()) return
    
    setIsCreating(true)
    try {
      const startupScript = selectedStartupScript === 'none' ? undefined : selectedStartupScript
      const sandbox = await createSandbox(newSandboxName, startupScript)
      selectSandbox(sandbox)
      setNewSandboxName('')
      setSelectedStartupScript('')
      setIsCreateOpen(false)
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'creating': return 'bg-yellow-500'
      case 'stopped': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Running'
      case 'creating': return 'Creating'
      case 'stopped': return 'Stopped'
      case 'error': return 'Error'
      default: return 'Unknown'
    }
  }

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Server className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Cloudflare Sandbox</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange('sandboxes')}
                  className={cn(
                    currentView === 'sandboxes' && "bg-primary/10 text-primary"
                  )}
                >
                  <Server className="h-4 w-4" />
                  <span>Sandbox Environments</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange('startup-scripts')}
                  className={cn(
                    currentView === 'startup-scripts' && "bg-primary/10 text-primary"
                  )}
                >
                  <Code className="h-4 w-4" />
                  <span>Startup Scripts</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {currentView === 'sandboxes' && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Active Sandboxes</span>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Sandbox</DialogTitle>
                  <DialogDescription>
                    Create a new sandbox environment with an optional startup script.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sandbox-name">Sandbox Name</Label>
                    <Input
                      id="sandbox-name"
                      value={newSandboxName}
                      onChange={(e) => setNewSandboxName(e.target.value)}
                      placeholder="Enter sandbox name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="startup-script">Startup Script (Optional)</Label>
                    <Select value={selectedStartupScript} onValueChange={setSelectedStartupScript}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No startup script" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No startup script</SelectItem>
                        {startupScripts.map((script) => (
                          <SelectItem key={script.id} value={script.content}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{script.name}</span>
                              {script.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {script.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {startupScripts.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        No startup scripts available. Create one in the Startup Scripts section.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSandbox} disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {sandboxes.map((sandbox) => (
                <SidebarMenuItem key={sandbox.id}>
                  <SidebarMenuButton
                    onClick={() => selectSandbox(sandbox)}
                    className={cn(
                      "w-full justify-start h-auto py-3",
                      selectedSandbox?.id === sandbox.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <div className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", getStatusColor(sandbox.status))} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-medium truncate">{sandbox.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getStatusText(sandbox.status)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {sandbox.createdAt.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Setup: {sandbox.metrics.creationTime || 0}ms
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                        {sandbox.processes.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {sandbox.processes.length}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSandbox(sandbox.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              </SidebarMenu>
            </SidebarGroupContent>

            {sandboxes.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Server className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">No sandbox environments</p>
                <p className="text-xs mt-1">Create your first sandbox to get started</p>
              </div>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {currentView === 'sandboxes' ? (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Active:</span>
              <span>{sandboxes.filter(s => s.status === 'running').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total:</span>
              <span>{sandboxes.length}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Scripts:</span>
              <span>{startupScripts.length}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}