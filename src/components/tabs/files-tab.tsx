import { useState, useEffect } from 'react'
import { FileText, Folder, Plus, Download, Edit, Save, X, ArrowLeft, ChevronRight, Home, Trash2, Move, FolderPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { SandboxEnvironment, FileNode, FileApiResponse } from '@/types/sandbox'
import { cn } from '@/lib/utils'

interface FilesTabProps {
  sandbox: SandboxEnvironment
}

export function FilesTab({ sandbox }: FilesTabProps) {
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileType, setNewFileType] = useState<'file' | 'directory'>('file')
  const [currentPath, setCurrentPath] = useState('/')
  const [pathHistory, setPathHistory] = useState<string[]>(['/'])
  const [selectedForAction, setSelectedForAction] = useState<FileNode | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    const loadFiles = async () => {
      try {
        console.log(`[FILES_FRONTEND] Loading files for sandbox ${sandbox.id} at path ${currentPath}`)
        console.log(`[FILES_FRONTEND] API URL: /api/sandboxes/${sandbox.id}/files?path=${encodeURIComponent(currentPath)}`)
        const response = await fetch(`/api/sandboxes/${sandbox.id}/files?path=${encodeURIComponent(currentPath)}`)
        console.log(`[FILES_FRONTEND] Response status: ${response.status}, ok: ${response.ok}`)
        
        if (response.ok) {
          const apiResponse = await response.json()
          console.log(`[FILES_FRONTEND] API Response:`, apiResponse)
          
          if (apiResponse.success && Array.isArray(apiResponse.data)) {
            console.log(`[FILES_FRONTEND] Found ${apiResponse.data.length} files in API response`)
            const fileNodes: FileNode[] = apiResponse.data.map((file: FileApiResponse) => ({
              name: file.name,
              path: file.path,
              type: file.type,
              size: file.size || 0,
              lastModified: new Date(file.lastModified)
            }))
            console.log(`[FILES_FRONTEND] Mapped file nodes:`, fileNodes)
            setFiles(fileNodes)
          } else {
            console.error('Failed to load files - API response not successful:', apiResponse)
            setFiles([])
          }
        } else {
          console.error(`[FILES_FRONTEND] HTTP error: ${response.status}`)
          const errorText = await response.text()
          console.error(`[FILES_FRONTEND] Error response body:`, errorText)
          setFiles([])
        }
      } catch (error) {
        console.error('Failed to load files:', error)
        // Fallback to empty list
        setFiles([])
      }
    }

    loadFiles()
  }, [sandbox.id, currentPath])

  const navigateBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = pathHistory.slice(0, -1)
      const previousPath = newHistory[newHistory.length - 1]
      setPathHistory(newHistory)
      setCurrentPath(previousPath)
      setSelectedFile(null)
      setFileContent('')
      setEditedContent('')
    }
  }

  const navigateToPath = (targetPath: string) => {
    const pathIndex = pathHistory.indexOf(targetPath)
    if (pathIndex !== -1) {
      const newHistory = pathHistory.slice(0, pathIndex + 1)
      setPathHistory(newHistory)
      setCurrentPath(targetPath)
      setSelectedFile(null)
      setFileContent('')
      setEditedContent('')
    }
  }

  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'directory') {
      // Navigate into directory
      console.log(`[FILES_FRONTEND] Navigating to directory: ${file.path}`)
      setCurrentPath(file.path)
      setPathHistory(prev => [...prev, file.path])
      setSelectedFile(null) // Clear file selection when navigating
      setFileContent('')
      setEditedContent('')
      return
    }
    
    setSelectedFile(file)
    setIsEditing(false)
    
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/files/read${file.path}`)
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success && apiResponse.data) {
          const content = apiResponse.data.content || ''
          setFileContent(content)
          setEditedContent(content)
        } else {
          console.error('Failed to read file:', apiResponse.error)
          setFileContent('Error loading file content')
          setEditedContent('')
        }
      } else {
        setFileContent('Error loading file content')
        setEditedContent('')
      }
    } catch (error) {
      console.error('Failed to load file content:', error)
      setFileContent('Error loading file content')
      setEditedContent('')
    }
  }

  const handleSave = async () => {
    if (!selectedFile) return
    
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedFile.path,
          content: editedContent
        })
      })
      
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success) {
          setFileContent(editedContent)
          setIsEditing(false)
        } else {
          console.error('Failed to save file:', apiResponse.error)
        }
      } else {
        console.error('Failed to save file')
      }
    } catch (error) {
      console.error('Error saving file:', error)
    }
  }

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return
    
    try {
      let response
      if (newFileType === 'directory') {
        // Create directory using mkdir API
        response = await fetch(`/api/sandboxes/${sandbox.id}/files/mkdir`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: `${currentPath === '/' ? '' : currentPath}/${newFileName}`
          })
        })
      } else {
        // Create file
        response = await fetch(`/api/sandboxes/${sandbox.id}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: `${currentPath === '/' ? '' : currentPath}/${newFileName}`,
            content: ''
          })
        })
      }
      
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success) {
          // Reload files to reflect the new file/directory
          const filesResponse = await fetch(`/api/sandboxes/${sandbox.id}/files?path=${encodeURIComponent(currentPath)}`)
          if (filesResponse.ok) {
            const filesApiResponse = await filesResponse.json()
            if (filesApiResponse.success && Array.isArray(filesApiResponse.data)) {
              const fileNodes: FileNode[] = filesApiResponse.data.map((file: FileApiResponse) => ({
                name: file.name,
                path: file.path,
                type: file.type,
                size: file.size || 0,
                lastModified: new Date(file.lastModified)
              }))
              setFiles(fileNodes)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to create file/directory:', error)
    }
    
    setNewFileName('')
    setIsCreateDialogOpen(false)
  }

  const handleDeleteFile = async () => {
    if (!selectedForAction) return
    
    try {
      const response = await fetch(`/api/sandboxes/${sandbox.id}/files/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedForAction.path
        })
      })
      
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success) {
          // Reload files
          const filesResponse = await fetch(`/api/sandboxes/${sandbox.id}/files?path=${encodeURIComponent(currentPath)}`)
          if (filesResponse.ok) {
            const filesApiResponse = await filesResponse.json()
            if (filesApiResponse.success && Array.isArray(filesApiResponse.data)) {
              const fileNodes: FileNode[] = filesApiResponse.data.map((file: FileApiResponse) => ({
                name: file.name,
                path: file.path,
                type: file.type,
                size: file.size || 0,
                lastModified: new Date(file.lastModified)
              }))
              setFiles(fileNodes)
            }
          }
          // Clear selection if the deleted file was selected
          if (selectedFile?.path === selectedForAction.path) {
            setSelectedFile(null)
            setFileContent('')
            setEditedContent('')
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
    
    setSelectedForAction(null)
    setIsDeleteDialogOpen(false)
  }

  const handleRenameFile = async () => {
    if (!selectedForAction || !renameValue.trim()) return
    
    try {
      const newPath = selectedForAction.path.replace(/[^/]*$/, renameValue)
      const response = await fetch(`/api/sandboxes/${sandbox.id}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: selectedForAction.path,
          newPath: newPath
        })
      })
      
      if (response.ok) {
        const apiResponse = await response.json()
        if (apiResponse.success) {
          // Reload files
          const filesResponse = await fetch(`/api/sandboxes/${sandbox.id}/files?path=${encodeURIComponent(currentPath)}`)
          if (filesResponse.ok) {
            const filesApiResponse = await filesResponse.json()
            if (filesApiResponse.success && Array.isArray(filesApiResponse.data)) {
              const fileNodes: FileNode[] = filesApiResponse.data.map((file: FileApiResponse) => ({
                name: file.name,
                path: file.path,
                type: file.type,
                size: file.size || 0,
                lastModified: new Date(file.lastModified)
              }))
              setFiles(fileNodes)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to rename file:', error)
    }
    
    setSelectedForAction(null)
    setRenameValue('')
    setIsRenameDialogOpen(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'directory') return <Folder className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const renderFiles = (fileList: FileNode[], depth = 0) => {
    console.log(`[FILES_FRONTEND] Rendering ${fileList.length} files:`, fileList.map(f => f.name))
    return fileList.map((file) => (
      <div key={file.path} className="group">
        <div
          className={cn(
            "flex items-center space-x-2 p-2 hover:bg-muted rounded transition-colors",
            selectedFile?.path === file.path && "bg-primary/10 text-primary"
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          <button
            onClick={() => handleFileSelect(file)}
            className="flex-1 flex items-center space-x-2 text-left"
          >
            {getFileIcon(file)}
            <span className="flex-1 text-sm">{file.name}</span>
            {file.type === 'file' && file.size && (
              <Badge variant="secondary" className="text-xs">
                {formatFileSize(file.size)}
              </Badge>
            )}
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Move className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => {
                  setSelectedForAction(file)
                  setRenameValue(file.name)
                  setIsRenameDialogOpen(true)
                }}
              >
                <Edit className="h-3 w-3 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setSelectedForAction(file)
                  setIsDeleteDialogOpen(true)
                }}
                className="text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {file.children && (
          <div>
            {renderFiles(file.children, depth + 1)}
          </div>
        )}
      </div>
    ))
  }

  return (
    <div className="flex h-full">
      {/* File Explorer */}
      <Card className="w-80 m-6 mr-3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Folder className="h-4 w-4" />
              <span>Files</span>
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New {newFileType === 'file' ? 'File' : 'Directory'}</DialogTitle>
                  <DialogDescription>
                    Create a new {newFileType} in {currentPath === '/' ? 'root directory' : currentPath}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Button
                      variant={newFileType === 'file' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewFileType('file')}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-3 w-3" />
                      File
                    </Button>
                    <Button
                      variant={newFileType === 'directory' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewFileType('directory')}
                      className="flex items-center gap-2"
                    >
                      <FolderPlus className="h-3 w-3" />
                      Directory
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="new-file-name">Name</Label>
                    <Input
                      id="new-file-name"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder={newFileType === 'file' ? 'filename.ext' : 'directory-name'}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateFile} disabled={!newFileName.trim()}>
                      {newFileType === 'file' ? <FileText className="h-3 w-3 mr-1" /> : <FolderPlus className="h-3 w-3 mr-1" />}
                      Create {newFileType === 'file' ? 'File' : 'Directory'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Navigation breadcrumbs */}
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={navigateBack}
              disabled={pathHistory.length <= 1}
              className="h-6 px-2"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigateToPath('/')}
              className="h-6 px-2"
            >
              <Home className="h-3 w-3" />
            </Button>
            {pathHistory.map((path, index) => (
              <div key={path} className="flex items-center">
                {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
                <button
                  onClick={() => navigateToPath(path)}
                  className="hover:text-foreground transition-colors text-xs"
                >
                  {path === '/' ? 'root' : path.split('/').pop()}
                </button>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-1">
              {renderFiles(files)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* File Editor */}
      <div className="flex-1 flex flex-col m-6 ml-3">
        {selectedFile ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getFileIcon(selectedFile)}
                  <span className="font-medium">{selectedFile.name}</span>
                  <Badge variant="outline">{selectedFile.path}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setIsEditing(false)
                        setEditedContent(fileContent)
                      }}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="flex-1 font-mono text-sm resize-none border-0 focus:ring-0"
                  placeholder="Enter file content..."
                />
              ) : (
                <ScrollArea className="flex-1">
                  <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                    {fileContent}
                  </pre>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a file to view or edit</p>
              <p className="text-sm mt-1">Use the file explorer on the left to navigate</p>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedForAction?.type === 'directory' ? 'Directory' : 'File'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedForAction?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {selectedForAction?.type === 'directory' ? 'Directory' : 'File'}</DialogTitle>
            <DialogDescription>
              Enter a new name for "{selectedForAction?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new name"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameFile} disabled={!renameValue.trim()}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}