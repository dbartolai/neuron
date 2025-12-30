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
import {useChat} from "@/hooks/use-chat"
import {useCourse} from "@/hooks/use-course"
import { useParams } from "next/navigation"


export default function ThreadPage() {

  const { courseId, threadId } = useParams<{
    courseId: string;
    threadId: string;
  }>();

  const {courseName} = useCourse(courseId);
  const {threadName, messages, sendMessage} = useChat(threadId);
  const [input, setInput] = useState("");

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
                  <BreadcrumbLink href={`http://localhost:3000/chat/${courseId}`}>
                    {courseName}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{threadName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col justify-between gap-4 p-4 pt-0">
          <div className="flex-1 overflow-y-auto">
            <MessageLog messages={messages}/>
          </div>
          <ChatInput value = {input} onChange={setInput} onSend={sendMessage} />
        </div>
      </SidebarInset>
      
    </SidebarProvider>
    
  )
}
