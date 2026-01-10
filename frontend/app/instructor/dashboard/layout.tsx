"use client"

import { AppSidebar } from "@/components/instructor-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page({ children }: { children: React.ReactNode }) {

  return (
     <SidebarProvider className="w-full min-h-svh">
      <AppSidebar />
      <SidebarInset className="min-h-svh overflow-auto">
        {children}
      </SidebarInset>
    </SidebarProvider>
   
  )
}
