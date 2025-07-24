import { useState } from 'react'
import { Settings, Code, GitBranch, Save, Plus, Trash2, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSandbox } from '@/contexts/sandbox-context'
import type { SandboxEnvironment, StartupScript } from '@/types/sandbox'

interface SettingsTabProps {
  sandbox: SandboxEnvironment
}

export function SettingsTab({ sandbox }: SettingsTabProps) {
  const { startupScripts, saveStartupScript } = useSandbox()
  const [isCreateScriptOpen, setIsCreateScriptOpen] = useState(false)
  const [newScriptName, setNewScriptName] = useState('')
  const [newScriptDescription, setNewScriptDescription] = useState('')
  const [newScriptContent, setNewScriptContent] = useState('')
  const [gitRepoUrl, setGitRepoUrl] = useState('')
  const [isCloning, setIsCloning] = useState(false)

  const handleCreateScript = () => {
    if (!newScriptName.trim() || !newScriptContent.trim()) return
    
    const script: StartupScript = {
      id: `script-${Date.now()}`,
      name: newScriptName,
      content: newScriptContent,
      description: newScriptDescription,
      createdAt: new Date()
    }
    
    saveStartupScript(script)
    setNewScriptName('')
    setNewScriptDescription('')
    setNewScriptContent('')
    setIsCreateScriptOpen(false)
  }

  const handleCloneRepo = async () => {
    if (!gitRepoUrl.trim()) return
    
    setIsCloning(true)
    try {
      // Simulate git clone operation
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('Cloning repository:', gitRepoUrl)
      // Here you would use the sandbox SDK to clone the repository
    } finally {
      setIsCloning(false)
      setGitRepoUrl('')
    }
  }

  const defaultScripts = [
    {
      name: 'Node.js Express Setup',
      content: `#!/bin/bash
# Install Node.js dependencies and start Express server
npm init -y
npm install express cors helmet
cat << 'EOF' > server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Cloudflare Sandbox!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOF
node server.js`
    },
    {
      name: 'Python Flask Setup',
      content: `#!/bin/bash
# Install Python Flask and start server
pip install flask flask-cors
cat << 'EOF' > app.py
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return jsonify({"message": "Hello from Python Flask!"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
EOF
python app.py`
    },
    {
      name: 'React Development Environment',
      content: `#!/bin/bash
# Create React app and start development server
npx create-react-app my-app --template typescript
cd my-app
npm start`
    }
  ]

  return (
    <div className="p-6">
      <Tabs defaultValue="startup-scripts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="startup-scripts" className="flex items-center space-x-2">
            <Code className="h-4 w-4" />
            <span>Startup Scripts</span>
          </TabsTrigger>
          <TabsTrigger value="git-integration" className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4" />
            <span>Git Integration</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="startup-scripts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Startup Scripts</h3>
              <p className="text-sm text-muted-foreground">
                Create reusable scripts to initialize new sandbox environments
              </p>
            </div>
            <Dialog open={isCreateScriptOpen} onOpenChange={setIsCreateScriptOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Script
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Startup Script</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="script-name">Script Name</Label>
                    <Input
                      id="script-name"
                      value={newScriptName}
                      onChange={(e) => setNewScriptName(e.target.value)}
                      placeholder="e.g., Node.js Express Setup"
                    />
                  </div>
                  <div>
                    <Label htmlFor="script-description">Description (Optional)</Label>
                    <Input
                      id="script-description"
                      value={newScriptDescription}
                      onChange={(e) => setNewScriptDescription(e.target.value)}
                      placeholder="Brief description of what this script does"
                    />
                  </div>
                  <div>
                    <Label htmlFor="script-content">Script Content</Label>
                    <Textarea
                      id="script-content"
                      value={newScriptContent}
                      onChange={(e) => setNewScriptContent(e.target.value)}
                      placeholder="#!/bin/bash\n# Your startup script here\necho 'Hello World'"
                      className="font-mono text-sm h-40"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateScriptOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateScript}>
                      <Save className="h-4 w-4 mr-1" />
                      Save Script
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Default/Template Scripts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Scripts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultScripts.map((script, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">{script.name}</h4>
                    <div className="text-xs font-mono bg-muted p-2 rounded mb-3 h-20 overflow-y-auto">
                      {script.content.split('\n').slice(0, 3).join('\n')}...
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      Use Template
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Scripts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Scripts ({startupScripts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {startupScripts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No custom scripts yet</p>
                  <p className="text-sm mt-1">Create your first startup script</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {startupScripts.map((script) => (
                    <div key={script.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{script.name}</h4>
                          {script.description && (
                            <p className="text-sm text-muted-foreground mt-1">{script.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              Created {script.createdAt.toLocaleDateString()}
                            </Badge>
                            {script.lastUsed && (
                              <Badge variant="outline" className="text-xs">
                                Last used {script.lastUsed.toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs font-mono bg-muted p-2 rounded h-20 overflow-y-auto">
                        {script.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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