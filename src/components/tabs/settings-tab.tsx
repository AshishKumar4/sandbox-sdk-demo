import { useState } from 'react'
import { Settings, GitBranch, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import type { SandboxEnvironment } from '@/types/sandbox'

interface SettingsTabProps {
  sandbox: SandboxEnvironment
}

export function SettingsTab({ sandbox }: SettingsTabProps) {
  const [gitRepoUrl, setGitRepoUrl] = useState('')
  const [isCloning, setIsCloning] = useState(false)


  const handleCloneRepo = async () => {
    if (!gitRepoUrl.trim()) return
    
    setIsCloning(true)
    try {
      console.log('Cloning repository:', gitRepoUrl)
      
      const response = await fetch(`/api/sandboxes/${sandbox.id}/git/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: gitRepoUrl,
          branch: 'main'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to clone repository')
      }
      
      const apiResponse = await response.json()
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to clone repository')
      }
      
      console.log('Repository cloned successfully:', apiResponse.data)
      // You might want to show a success message or refresh file list here
      
    } catch (error) {
      console.error('Failed to clone repository:', error)
      // You might want to show an error message to the user
    } finally {
      setIsCloning(false)
      setGitRepoUrl('')
    }
  }


  return (
    <div className="p-6">
      <Tabs defaultValue="git-integration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="git-integration" className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4" />
            <span>Git Integration</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="git-integration" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Git Integration</h3>
            <p className="text-sm text-muted-foreground">
              Clone repositories directly into your sandbox environment
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clone Repository</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="git-url">Repository URL</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="git-url"
                    value={gitRepoUrl}
                    onChange={(e) => setGitRepoUrl(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                    className="flex-1"
                  />
                  <Button onClick={handleCloneRepo} disabled={isCloning}>
                    {isCloning ? 'Cloning...' : 'Clone'}
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Quick Clone Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { name: 'Express.js Starter', url: 'https://github.com/expressjs/express.git' },
                    { name: 'React App', url: 'https://github.com/facebook/create-react-app.git' },
                    { name: 'Next.js Example', url: 'https://github.com/vercel/next.js.git' },
                    { name: 'Vue.js Starter', url: 'https://github.com/vuejs/vue.git' }
                  ].map((template) => (
                    <Button
                      key={template.name}
                      variant="outline"
                      size="sm"
                      onClick={() => setGitRepoUrl(template.url)}
                      className="justify-start"
                    >
                      <GitBranch className="h-3 w-3 mr-2" />
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">General Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure your sandbox environment preferences
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sandbox Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sandbox ID</Label>
                  <Input value={sandbox.id} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={sandbox.name} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input value={sandbox.status} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Created</Label>
                  <Input value={sandbox.createdAt.toLocaleString()} readOnly className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input placeholder="Variable name" className="flex-1" />
                  <Input placeholder="Value" className="flex-1" />
                  <Button variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Environment variables will be available to all processes in this sandbox
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}