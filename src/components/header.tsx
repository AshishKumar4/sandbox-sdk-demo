import { Activity, Clock, Code, Server, Terminal, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSandbox } from '@/contexts/sandbox-context'

type AppView = 'sandboxes' | 'startup-scripts'

interface HeaderProps {
  currentView: AppView
}

export function Header({ currentView }: HeaderProps) {
  const { sandboxes, startupScripts, commandHistory } = useSandbox()
  
  const activeSandboxes = sandboxes.filter(s => s.status === 'running').length
  const creatingSandboxes = sandboxes.filter(s => s.status === 'creating').length
  const totalSandboxes = sandboxes.length
  const totalCommands = commandHistory.length
  
  // Calculate total processes across all sandboxes
  const totalProcesses = sandboxes.reduce((acc, sandbox) => {
    return acc + (sandbox.processes?.length || 0)
  }, 0)
  
  // Calculate average creation time from existing sandboxes
  const avgCreationTime = sandboxes.length > 0 
    ? sandboxes.reduce((sum, sb) => sum + (sb.metrics?.creationTime || 0), 0) / sandboxes.length
    : 0

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <header className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">
            {currentView === 'sandboxes' ? 'Sandbox Dashboard' : 'Startup Scripts'}
          </h1>
          {currentView === 'sandboxes' && (
            <div className="flex items-center space-x-2">
              {activeSandboxes > 0 && (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <Activity className="w-3 h-3 mr-1" />
                  {activeSandboxes} Active
                </Badge>
              )}
              {creatingSandboxes > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {creatingSandboxes} Creating
                </Badge>
              )}
            </div>
          )}
          {currentView === 'startup-scripts' && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Code className="w-3 h-3" />
                {startupScripts.length} Scripts
              </Badge>
            </div>
          )}
        </div>

        {currentView === 'sandboxes' && (
          <div className="flex items-center space-x-4">
            <Card className="px-4 py-2">
              <div className="flex items-center space-x-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <div>
                  <div className="font-medium">Avg Creation</div>
                  <div className="text-muted-foreground">
                    {formatTime(avgCreationTime)}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="px-4 py-2">
              <div className="flex items-center space-x-2 text-sm">
                <Server className="w-4 h-4 text-primary" />
                <div>
                  <div className="font-medium">Total Sandboxes</div>
                  <div className="text-muted-foreground">
                    {totalSandboxes.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="px-4 py-2">
              <div className="flex items-center space-x-2 text-sm">
                <Terminal className="w-4 h-4 text-primary" />
                <div>
                  <div className="font-medium">Commands Run</div>
                  <div className="text-muted-foreground">
                    {totalCommands.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="px-4 py-2">
              <div className="flex items-center space-x-2 text-sm">
                <Activity className="w-4 h-4 text-primary" />
                <div>
                  <div className="font-medium">Active Processes</div>
                  <div className="text-muted-foreground">
                    {totalProcesses.toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </header>
  )
}