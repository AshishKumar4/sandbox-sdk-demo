import { useState } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'
import { MainContent } from '@/components/main-content'
import { StartupScriptsManager } from '@/components/startup-scripts-manager'
import { SandboxProvider, useSandbox } from '@/contexts/sandbox-context'

type AppView = 'sandboxes' | 'startup-scripts'

function AppContent() {
  const { selectedSandbox } = useSandbox()
  const [currentView, setCurrentView] = useState<AppView>('sandboxes')

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header currentView={currentView} />
          {currentView === 'sandboxes' ? (
            <MainContent selectedSandbox={selectedSandbox} />
          ) : (
            <StartupScriptsManager />
          )}
        </div>
      </div>
    </SidebarProvider>
  )
}

function App() {
  return (
    <SandboxProvider>
      <AppContent />
    </SandboxProvider>
  )
}

export default App
