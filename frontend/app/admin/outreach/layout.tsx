"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page({ children }: { children: React.ReactNode }) {

  return (
     <SidebarProvider className="w-full min-h-svh">
      <AdminSidebar />
      <SidebarInset className=" overflow-auto">
        {children}
      </SidebarInset>
    </SidebarProvider>
   
  )
}
