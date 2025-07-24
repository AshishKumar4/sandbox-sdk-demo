import { Activity, Clock, Zap, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSandbox } from '@/contexts/sandbox-context'

export function Header() {
  const { globalMetrics, sandboxes } = useSandbox()
  
  const activeSandboxes = sandboxes.filter(s => s.status === 'running').length
  const creatingSandboxes = sandboxes.filter(s => s.status === 'creating').length

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <header className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Sandbox Dashboard</h1>
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
        </div>

        <div className="flex items-center space-x-4">
          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <div>
                <div className="font-medium">Avg Creation</div>
                <div className="text-muted-foreground">
                  {formatTime(globalMetrics.avgCreationTime)}
                </div>
              </div>
            </div>
          </Card>

          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <div className="font-medium">Success Rate</div>
                <div className="text-muted-foreground">
                  {formatPercent(globalMetrics.successRate)}
                </div>
              </div>
            </div>
          </Card>

          <Card className="px-4 py-2">
            <div className="flex items-center space-x-2 text-sm">
              <Activity className="w-4 h-4 text-primary" />
              <div>
                <div className="font-medium">Total Commands</div>
                <div className="text-muted-foreground">
                  {globalMetrics.totalCommands.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </header>
  )
}