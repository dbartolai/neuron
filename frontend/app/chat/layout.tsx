"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page({ children }: { children: React.ReactNode }) {

  return (
     <SidebarProvider className="w-full max-h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="max-h-svh overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
   
  )
}
