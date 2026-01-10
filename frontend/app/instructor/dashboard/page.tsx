"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {useChat} from "@/hooks/use-chat"
import { useRouter } from "next/navigation"
import { useInstructor } from "@/hooks/use-instructor"
import CourseSelect from "@/components/chat/course-select"
import EmptyDashboard from "@/components/instructor/empty"
import { getAccessToken } from "@/lib/supabase/client"


export default function Page() {

    const { courses } = useInstructor();

    console.log(courses.length);
    
    return (
        <>
        {courses.length > 0 ? (
        <div className=" min-h-screen flex flex-col items-center justify-center" >
        <h3 className="text-lg mb-3">Select a course to begin chatting.</h3>
        <div className="flex flex-col gap-2 max-w-md">
            {courses.map( c => (
            <CourseSelect key={c.id} name={c.title} url={c.url} icon={c.icon}/>
            ))}
        </div>
        </div>  ) : (
            <EmptyDashboard/>
        )
        }
        </> 
    )
}
