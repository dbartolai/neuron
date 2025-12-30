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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import ChatInput from "@/components/chat/chat-input"
import MessageLog from "@/components/chat/message-log"
import {useCourse} from "@/hooks/use-course"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/supabase/client"


export default function CoursePage() {

  const { courseId } = useParams<{
    courseId: string;
  }>();

  const router = useRouter();

  const {courseName} = useCourse(courseId);
  const [input, setInput] = useState("");

  const sendMessage = async () => {

    // create thread as a POST at /courses/{courseid}/thread
    const token = await getAccessToken();

    const res = await fetch(`http://localhost:8000/courses/${courseId}/thread`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            first_message: input,
        })
    })

    if (!res.ok) {
        throw new Error (`couldn't create thread: ${res.status}`);
    }
    
    const data = await res.json();

    // finally push route with new thread id
    router.push(`/chat/${courseId}/${data.id}`)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    {courseName}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Chat</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col justify-between gap-4 p-4 pt-0">
          <div className="flex-1 overflow-y-auto">
            <MessageLog messages={[]}/>
          </div>
          <ChatInput value = {input} onChange={setInput} onSend={sendMessage} />
        </div>
      </SidebarInset>
      
    </SidebarProvider>
    
  )
}
