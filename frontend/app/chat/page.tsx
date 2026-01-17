"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {useChat} from "@/hooks/use-chat"
import { useRouter } from "next/navigation"
import { useSidebar } from "@/hooks/use-sidebar"
import CourseSelect from "@/components/chat/course-select"
import { getAccessToken } from "@/lib/supabase/client"
import EmptyDashboard from "@/components/student/empty"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function Page() {

  const { courses } = useSidebar();

  console.log("Courses:", courses);

  
  return (
    <>
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
      </div>
    </header>

    { courses.length > 0 ? (
    <div className=" min-h-screen flex flex-col items-center justify-center" >
      <h3 className="text-lg mb-3">Select a course to begin chatting.</h3>
      <div className="flex flex-col gap-2 max-w-md">
        {courses.map( c => (
          <CourseSelect key={c.id} name={c.title} url={c.url} icon={c.icon}/>
        ))}
      </div>
    </div>  ):(
      <EmptyDashboard/>
    )
    }
    </>   
  )
}
