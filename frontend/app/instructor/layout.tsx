"use client"

import { AppSidebar } from "@/components/instructor-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page({ children }: { children: React.ReactNode }) {

  return (
     <SidebarProvider className="w-full max-h-svh">
      <AppSidebar />
      <SidebarInset className=" overflow-auto">
        {children}
      </SidebarInset>
    </SidebarProvider>
   
  )
}
