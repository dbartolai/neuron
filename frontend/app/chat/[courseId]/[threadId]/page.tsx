"use client"

import { useState } from "react"
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
  const {threadName, messages, sendMessage, isStreaming, streamingContent, useFallback, getViolationMetadata} = useChat(threadId);
  const [input, setInput] = useState("");

  // Wrapper for sendMessage that clears input
  const handleSend = async (content: string) => {
    setInput("");
    await sendMessage(content);
  };

  return (
      <div className="flex h-svh flex-col overflow-hidden">
        
        <header className="flex h-16 shrink-0 ">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/chat/${courseId}`}>
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


        <div className="flex flex-1 min-h-0 flex-col">

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-none chat-scroll">
            <div className="mx-auto w-full max-w-3xl px-4">
              <MessageLog 
                messages={messages} 
                isStreaming={isStreaming}
                streamingContent={streamingContent}
                threadId={threadId}
                sendMessage={sendMessage}
                useFallback={useFallback}
                getViolationMetadata={getViolationMetadata}
              />
            </div>
          </div>

          <div className="shrink-0 bg-background w-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-4">
              <ChatInput value={input} onChange={setInput} onSend={handleSend} />
            </div>
          </div>

        </div>
      </div>
    
  )
}
