import type { ReactNode } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from "./ui/sidebar"
import { TooltipProvider } from "./ui/tooltip"

/** Every screen lives here (LAY-01); resizing only through Resizable (LAY-05). */
export function AppShell({
  sidebarHeader,
  sidebar,
  children,
}: {
  sidebarHeader: ReactNode
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh min-h-0">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="22%" minSize="14%" maxSize="40%">
            <Sidebar collapsible="none" className="w-full border-r">
              <SidebarHeader>{sidebarHeader}</SidebarHeader>
              <SidebarContent>{sidebar}</SidebarContent>
            </Sidebar>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>
            <main
              id="main-content"
              className="flex h-full min-w-0 flex-col bg-background"
            >
              {children}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
    </TooltipProvider>
  )
}
