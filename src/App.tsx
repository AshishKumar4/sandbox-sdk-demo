import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'
import { MainContent } from '@/components/main-content'
import { SandboxProvider, useSandbox } from '@/contexts/sandbox-context'

function AppContent() {
  const { selectedSandbox } = useSandbox()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <MainContent selectedSandbox={selectedSandbox} />
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
