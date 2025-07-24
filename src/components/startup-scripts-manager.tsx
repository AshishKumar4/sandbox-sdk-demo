import { useState } from 'react'
import { Code, Save, Plus, Trash2, Edit3, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSandbox } from '@/contexts/sandbox-context'
import type { StartupScript } from '@/types/sandbox'

export function StartupScriptsManager() {
  const { startupScripts, saveStartupScript } = useSandbox()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingScript, setEditingScript] = useState<StartupScript | null>(null)
  const [newScriptName, setNewScriptName] = useState('')
  const [newScriptDescription, setNewScriptDescription] = useState('')
  const [newScriptContent, setNewScriptContent] = useState('')

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
    resetForm()
    setIsCreateOpen(false)
  }

  const handleEditScript = (script: StartupScript) => {
    setEditingScript(script)
    setNewScriptName(script.name)
    setNewScriptDescription(script.description || '')
    setNewScriptContent(script.content)
    setIsCreateOpen(true)
  }

  const handleUpdateScript = () => {
    if (!editingScript || !newScriptName.trim() || !newScriptContent.trim()) return
    
    const updatedScript: StartupScript = {
      ...editingScript,
      name: newScriptName,
      content: newScriptContent,
      description: newScriptDescription
    }
    
    saveStartupScript(updatedScript)
    resetForm()
    setIsCreateOpen(false)
    setEditingScript(null)
  }

  const handleUseTemplate = (template: { name: string; content: string; description?: string }) => {
    setNewScriptName(template.name)
    setNewScriptDescription(template.description || '')
    setNewScriptContent(template.content)
    setIsCreateOpen(true)
  }

  const resetForm = () => {
    setNewScriptName('')
    setNewScriptDescription('')
    setNewScriptContent('')
    setEditingScript(null)
  }

  const handleCloseDialog = () => {
    setIsCreateOpen(false)
    resetForm()
  }

  const templateScripts = [
    {
      name: 'Node.js Express Server',
      description: 'Sets up a basic Express.js server with CORS and security middleware',
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

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});
EOF

echo "🔧 Starting Express server..."
node server.js`
    },
    {
      name: 'Python Flask API',
      description: 'Creates a Flask API server with CORS support',
      content: `#!/bin/bash
# Install Python Flask and start server
pip install flask flask-cors

cat << 'EOF' > app.py
from flask import Flask, jsonify
from flask_cors import CORS
import datetime

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return jsonify({
        "message": "Hello from Python Flask!",
        "timestamp": datetime.datetime.now().isoformat()
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    print("🐍 Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
EOF

python app.py`
    },
    {
      name: 'React Development Setup',
      description: 'Creates a new React app with TypeScript and starts the dev server',
      content: `#!/bin/bash
# Create React app and start development server
echo "⚛️ Creating React app with TypeScript..."
npx create-react-app my-sandbox-app --template typescript

cd my-sandbox-app

echo "🚀 Starting development server..."
npm start`
    },
    {
      name: 'Docker Environment',
      description: 'Sets up Docker and runs a sample container',
      content: `#!/bin/bash
# Docker setup and sample container
echo "🐳 Setting up Docker environment..."

# Create a simple Dockerfile
cat << 'EOF' > Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Create package.json
cat << 'EOF' > package.json
{
  "name": "docker-sandbox",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
EOF

# Create simple server
cat << 'EOF' > server.js
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Docker container!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
EOF

echo "Building and running Docker container..."
docker build -t sandbox-app .
docker run -p 3000:3000 sandbox-app`
    }
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Code className="h-8 w-8 text-primary" />
            Startup Scripts Manager
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and manage reusable scripts to initialize new sandbox environments
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create New Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingScript ? 'Edit Startup Script' : 'Create New Startup Script'}
              </DialogTitle>
              <DialogDescription>
                {editingScript 
                  ? 'Modify your existing startup script configuration.' 
                  : 'Create a new reusable startup script for sandbox environments.'
                }
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="script-name">Script Name *</Label>
                    <Input
                      id="script-name"
                      value={newScriptName}
                      onChange={(e) => setNewScriptName(e.target.value)}
                      placeholder="e.g., Node.js Express Setup"
                    />
                  </div>
                  <div>
                    <Label htmlFor="script-description">Description</Label>
                    <Input
                      id="script-description"
                      value={newScriptDescription}
                      onChange={(e) => setNewScriptDescription(e.target.value)}
                      placeholder="Brief description of what this script does"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="script-content">Script Content *</Label>
                  <Textarea
                    id="script-content"
                    value={newScriptContent}
                    onChange={(e) => setNewScriptContent(e.target.value)}
                    placeholder="#!/bin/bash&#10;# Your startup script here&#10;echo 'Setting up environment...'"
                    className="font-mono text-sm"
                    rows={20}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button onClick={editingScript ? handleUpdateScript : handleCreateScript}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingScript ? 'Update Script' : 'Save Script'}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Template Scripts */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Template Scripts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ready-to-use templates for common setups
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateScripts.map((template, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <h4 className="font-medium mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Custom Scripts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Your Scripts ({startupScripts.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {startupScripts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Code className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No custom scripts yet</h3>
                  <p className="text-sm mb-4">
                    Create your first startup script or use a template to get started
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Script
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {startupScripts.map((script) => (
                    <div key={script.id} className="border rounded-lg p-6 hover:border-primary/20 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{script.name}</h4>
                          {script.description && (
                            <p className="text-sm text-muted-foreground mb-3">{script.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
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
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditScript(script)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <Separator className="mb-4" />
                      
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Script Preview</span>
                          <Badge variant="outline" className="text-xs">
                            {script.content.split('\n').length} lines
                          </Badge>
                        </div>
                        <ScrollArea className="h-32">
                          <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {script.content.split('\n').slice(0, 15).join('\n')}
                            {script.content.split('\n').length > 15 && '\n...'}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}