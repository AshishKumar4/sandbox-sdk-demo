import { useState, useEffect } from 'react'
import { Activity, Clock, Cpu, HardDrive, Zap, TrendingUp, Timer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import type { SandboxEnvironment, TimeSeriesDataPoint, CommandStat } from '@/types/sandbox'

interface MetricsTabProps {
  sandbox: SandboxEnvironment
}

export function MetricsTab({ sandbox }: MetricsTabProps) {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([])
  const [commandStats, setCommandStats] = useState<CommandStat[]>([])
  const [sandboxMetrics, setSandboxMetrics] = useState(sandbox.metrics)
  
  useEffect(() => {
    // Fetch real metrics data from backend
    const fetchMetrics = async () => {
      try {
        console.log(`[METRICS_FRONTEND] Fetching metrics for sandbox ${sandbox.id}`)
        const response = await fetch(`/api/metrics/${sandbox.id}`)
        
        if (response.ok) {
          const apiResponse = await response.json()
          if (apiResponse.success && apiResponse.data) {
            console.log(`[METRICS_FRONTEND] Received metrics:`, apiResponse.data)
            setSandboxMetrics(apiResponse.data.sandbox.metrics)
          }
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      }
    }
    
    fetchMetrics()
    
    // Update metrics every 10 seconds
    const metricsInterval = setInterval(fetchMetrics, 10000)
    
    return () => clearInterval(metricsInterval)
  }, [sandbox.id])

  useEffect(() => {
    // Generate mock time series data
    const generateTimeSeriesData = () => {
      const now = Date.now()
      const data = []
      for (let i = 19; i >= 0; i--) {
        data.push({
          time: new Date(now - i * 60000).toLocaleTimeString().slice(0, 5),
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          commandTime: Math.random() * 50
        })
      }
      return data
    }

    // Generate command statistics
    const generateCommandStats = () => {
      const commands = ['ls', 'pwd', 'npm install', 'git clone', 'node', 'echo']
      return commands.map(cmd => ({
        command: cmd,
        count: Math.floor(Math.random() * 50) + 1,
        avgTime: Math.floor(Math.random() * 1000) + 100,
        successRate: 0.8 + Math.random() * 0.2
      }))
    }

    setTimeSeriesData(generateTimeSeriesData())
    setCommandStats(generateCommandStats())

    const interval = setInterval(() => {
      setTimeSeriesData(generateTimeSeriesData())
    }, 5000)

    return () => clearInterval(interval)
  }, [sandbox.id])

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }

  const uptime = Date.now() - sandbox.createdAt.getTime()
  const performanceScore = Math.max(0, 100 - ((sandboxMetrics.avgCommandTime || 0) / 10))
  
  const pieData = [
    { name: 'Available', value: 100 - (sandboxMetrics.cpuUsage || 0), color: '#10b981' },
    { name: 'Used', value: sandboxMetrics.cpuUsage || 0, color: '#f97316' }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(uptime)}</div>
            <p className="text-xs text-muted-foreground">
              Since {sandbox.createdAt.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commands Executed</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sandboxMetrics.totalCommands || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {(sandboxMetrics.avgCommandTime || 0).toFixed(0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P99 Response Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(sandboxMetrics.p99CommandTime || 0).toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              99th percentile
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceScore.toFixed(0)}/100</div>
            <Progress value={performanceScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-5 w-5" />
              <span>CPU Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Current</span>
                <Badge variant="secondary">{(sandboxMetrics.cpuUsage || 0).toFixed(1)}%</Badge>
              </div>
              <Progress value={sandboxMetrics.cpuUsage || 0} className="h-3" />
              
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Current</span>
                <Badge variant="secondary">{(sandboxMetrics.memoryUsage || 0).toFixed(1)}%</Badge>
              </div>
              <Progress value={sandboxMetrics.memoryUsage || 0} className="h-3" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span>{formatBytes((sandboxMetrics.memoryUsage || 0) * 1024 * 1024)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available:</span>
                  <span>{formatBytes((100 - (sandboxMetrics.memoryUsage || 0)) * 1024 * 1024)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>1024MB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Process Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Processes</span>
                <Badge variant="default">{sandbox.processes.length}</Badge>
              </div>
              
              <div className="space-y-2">
                {sandbox.processes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active processes</p>
                ) : (
                  sandbox.processes.slice(0, 3).map((process) => (
                    <div key={process.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="text-sm font-mono">{process.command}</div>
                      <Badge variant={process.status === 'running' ? 'default' : 'secondary'}>
                        {process.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Exposed Ports</span>
                <Badge variant="outline">{sandbox.exposedPorts.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Usage Over Time</CardTitle>
            <CardDescription>CPU and Memory usage in the last 20 minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpu" stroke="#f97316" strokeWidth={2} name="CPU %" />
                  <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} name="Memory %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Command Statistics</CardTitle>
            <CardDescription>Most frequently used commands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commandStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="command" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" name="Executions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Creation Metrics</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Creation Time:</span>
                  <span>{formatTime(sandboxMetrics.creationTime || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>First Command:</span>
                  <span>{formatTime((sandboxMetrics.creationTime || 0) + 500)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Command Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Fastest Command:</span>
                  <span>45ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Slowest Command:</span>
                  <span>{(sandboxMetrics.p99CommandTime || 0).toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span>98.7%</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Network & I/O</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Network In:</span>
                  <span>2.3MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Out:</span>
                  <span>1.8MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Disk I/O:</span>
                  <span>15.2MB</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}