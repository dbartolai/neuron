"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {useChat} from "@/hooks/use-chat"
import { useRouter } from "next/navigation"
import { useSidebar } from "@/hooks/use-sidebar"
import CourseSelect from "@/components/chat/course-select"


export default function Page() {

  const router = useRouter();

  const { courses } = useSidebar();

  console.log("Courses:", courses);

  return (
    <div className=" min-h-screen flex flex-col items-center justify-center" >
      <h3 className="text-lg mb-3">Select a course to begin chatting.</h3>
      <div className="flex flex-col gap-2 max-w-md">
        {courses.map( c => (
          <CourseSelect key={c.id} name={c.title} url={c.url} icon={c.icon}/>
        ))}
      </div>
    </div>    
  )
}
