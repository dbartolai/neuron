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

  const params = useParams();
  console.log(params);

  const { courseId } = useParams<{
    courseId: string;
  }>();

  const router = useRouter();

  const {courseName} = useCourse(courseId);
  const [input, setInput] = useState("");

  const sendMessage = async () => {

    // create thread as a POST at /courses/{courseid}/thread
    const token = await getAccessToken();

    console.log("Sending Message:")
    console.log(courseId)
    console.log(input)

    const res = await fetch(`http://localhost:8000/courses/${courseId}/thread`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
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
        <>
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
        <div className="flex flex-1 min-h-0 flex-col gap-4 p-4 pt-0 overflow-x-hidden">
          <div className="flex w-full max-w-3xl mx-auto flex-1 min-h-0 flex-col gap-4 overflow-y-auto overscroll-none">
            <MessageLog messages={[]}/>
          </div>
          <div className="w-full max-w-3xl mx-auto bg-background sticky bottom-0 z-10">
            <ChatInput value = {input} onChange={setInput} onSend={sendMessage} />
          </div>
        </div>
        </>
  )
}
