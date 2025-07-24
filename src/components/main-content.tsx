import { Terminal, FileText, GitBranch, Activity, Settings, Zap, Globe } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TerminalTab } from '@/components/tabs/terminal-tab'
import { FilesTab } from '@/components/tabs/files-tab'
import { ProcessesTab } from '@/components/tabs/processes-tab'
import { MetricsTab } from '@/components/tabs/metrics-tab'
import { SettingsTab } from '@/components/tabs/settings-tab'
import { PortsTab } from '@/components/tabs/ports-tab'
import type { SandboxEnvironment } from '@/types/sandbox'

interface MainContentProps {
  selectedSandbox: SandboxEnvironment | null
}

export function MainContent({ selectedSandbox }: MainContentProps) {
  if (!selectedSandbox) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center space-x-2">
              <Terminal className="h-6 w-6" />
              <span>No Sandbox Selected</span>
            </CardTitle>
            <CardDescription>
              Select a sandbox from the sidebar or create a new one to get started with the Cloudflare Sandbox SDK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span>Interactive Terminal</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>File Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span>Git Integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>Process Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span>Port Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>Real-time Metrics</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b px-6 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <h2 className="text-lg font-semibold">{selectedSandbox.name}</h2>
          <div className="text-sm text-muted-foreground">
            Created {selectedSandbox.createdAt.toLocaleDateString()}
          </div>
        </div>
      </div>

      <Tabs defaultValue="terminal" className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="terminal" className="flex items-center space-x-2">
            <Terminal className="h-4 w-4" />
            <span>Terminal</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Files</span>
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Processes</span>
          </TabsTrigger>
          <TabsTrigger value="ports" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Ports</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="terminal" className="h-full m-0">
            <TerminalTab sandbox={selectedSandbox} />
          </TabsContent>
          
          <TabsContent value="files" className="h-full m-0">
            <FilesTab sandbox={selectedSandbox} />
          </TabsContent>
          
          <TabsContent value="processes" className="h-full m-0">
            <ProcessesTab sandbox={selectedSandbox} />
          </TabsContent>
          
          <TabsContent value="ports" className="h-full m-0">
            <PortsTab sandbox={selectedSandbox} />
          </TabsContent>
          
          <TabsContent value="metrics" className="h-full m-0">
            <MetricsTab sandbox={selectedSandbox} />
          </TabsContent>
          
          <TabsContent value="settings" className="h-full m-0">
            <SettingsTab sandbox={selectedSandbox} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}