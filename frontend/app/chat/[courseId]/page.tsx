"use client"

import { useState, useRef, useCallback } from "react"
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
import ChatWelcome from "@/components/chat/chat-welcome"
import {useCourse} from "@/hooks/use-course"
import { useParams } from "next/navigation"
import { getAccessToken } from "@/lib/supabase/client"
import { ChatRole, ChatMessage, useChat } from "@/hooks/use-chat"
import { H1, Muted } from "@/components/primitives"
import { getApiUrl } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type ThreadType = "writing" | "testing" | "debugging"

// Helper function to parse SSE events from a chunk of text
function parseSSEEvents(chunk: string): Array<{event: string, data: string}> {
    const events: Array<{event: string, data: string}> = [];
    const lines = chunk.split('\n');
    
    let currentEvent = '';
    let currentData = '';
    
    for (const line of lines) {
        if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
        } else if (line === '' && currentEvent && currentData) {
            events.push({ event: currentEvent, data: currentData });
            currentEvent = '';
            currentData = '';
        }
    }
    
    return events;
}

export default function CoursePage() {

  const { courseId } = useParams<{
    courseId: string;
  }>();

  const {access, courseName, policy, courseLoading, policyLoading} = useCourse(courseId);
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<ThreadType>("writing");
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Track the active thread ID after first message exchange
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  // Use chat hook for follow-up messages (only activates when activeThreadId is set)
  const chat = useChat(activeThreadId || "");
  
  // Token queue for smooth rendering (ChatGPT-like effect)
  const tokenQueueRef = useRef<string[]>([]);
  const drainIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fullContentRef = useRef<string>("");
  const threadIdRef = useRef<string | null>(null);

  // Start draining the token queue at a fixed interval
  const startDraining = useCallback(() => {
    if (drainIntervalRef.current) return;
    
    drainIntervalRef.current = setInterval(() => {
      if (tokenQueueRef.current.length > 0) {
        const token = tokenQueueRef.current.shift()!;
        fullContentRef.current += token;
        setStreamingContent(fullContentRef.current);
      }
    }, 20);
  }, []);

  // Stop draining the token queue
  const stopDraining = useCallback(() => {
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
  }, []);

  // Create first thread and stream response
  const createThread = async () => {
    if (!input.trim() || isCreating) return;

    const messageContent = input;
    setInput("");
    setLocalMessages([{ role: ChatRole.STUDENT, content: messageContent }]);
    setIsCreating(true);
    setIsStreaming(true);
    setStreamingContent("");
    
    // Reset token queue for new stream
    tokenQueueRef.current = [];
    fullContentRef.current = "";
    threadIdRef.current = null;
    startDraining();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await getAccessToken();

      const res = await fetch(`${getApiUrl()}/courses/${courseId}/thread/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          first_message: messageContent,
          thread_type: mode,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`couldn't create thread: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const events = parseSSEEvents(buffer);
        
        for (const event of events) {
          if (event.event === 'thread_created') {
            try {
              const data = JSON.parse(event.data);
              threadIdRef.current = data.id;
            } catch (e) {
              console.error("Failed to parse thread_created event", e);
            }
          } else if (event.event === 'token') {
            try {
              const data = JSON.parse(event.data);
              tokenQueueRef.current.push(data.content);
            } catch (e) {
              // Ignore parse errors
            }
          } else if (event.event === 'done') {
            break;
          }
        }
        
        // Clear processed events from buffer
        const lastDoubleNewline = buffer.lastIndexOf('\n\n');
        if (lastDoubleNewline !== -1) {
          buffer = buffer.slice(lastDoubleNewline + 2);
        }
      }

      // Wait for queue to fully drain
      const waitForDrain = () => {
        return new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (tokenQueueRef.current.length === 0) {
              clearInterval(check);
              resolve();
            }
          }, 50);
        });
      };

      await waitForDrain();
      stopDraining();

      // Store completed messages locally
      const finalContent = fullContentRef.current;
      setLocalMessages([
        { role: ChatRole.STUDENT, content: messageContent },
        { role: ChatRole.ASSISTANT, content: finalContent }
      ]);
      setIsStreaming(false);
      setIsCreating(false);
      setStreamingContent("");

      // Switch to thread mode and update URL without navigation
      if (threadIdRef.current) {
        setActiveThreadId(threadIdRef.current);
        window.history.replaceState({}, '', `/chat/${courseId}/${threadIdRef.current}`);
      }

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        stopDraining();
        tokenQueueRef.current = [];
        fullContentRef.current = "";
        return;
      }
      console.error("Error creating thread:", err);
      stopDraining();
      setIsCreating(false);
      setIsStreaming(false);
      setLocalMessages([]);
    }
  }

  // Handle sending messages - routes to createThread or useChat.sendMessage
  const handleSend = async () => {
    if (activeThreadId) {
      // Thread exists, use useChat's sendMessage for follow-ups
      const content = input;
      setInput("");
      await chat.sendMessage(content);
    } else {
      // No thread yet, create one
      await createThread();
    }
  };

  // Determine which messages to display
  // Before activeThreadId: show local messages
  // After activeThreadId: prefer useChat messages (fetched from server), fall back to local
  const displayMessages = activeThreadId && chat.messages.length > 0 
    ? chat.messages 
    : localMessages;

  // Determine streaming state
  const showStreaming = activeThreadId 
    ? chat.isStreaming 
    : isStreaming;
  
  const displayStreamingContent = activeThreadId 
    ? chat.streamingContent 
    : streamingContent;

  // Determine breadcrumb text
  const breadcrumbText = activeThreadId && chat.threadName 
    ? chat.threadName 
    : "New Chat";

  // Show welcome screen when no messages and not creating
  const showWelcome = localMessages.length === 0 && !activeThreadId && !isCreating;

  // Show skeleton while loading or when access is not yet determined
  const isLoading = courseLoading || access === null;

  return (
        <>
        {isLoading ? (
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
                      <Skeleton className="h-4 w-32" />
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <Skeleton className="h-4 w-24" />
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 min-h-0 flex-col gap-4 p-4 pt-0 overflow-x-hidden">
              <div className="flex w-full max-w-3xl mx-auto flex-1 min-h-0 flex-col gap-4 overflow-y-auto overscroll-none">
                <div className="flex flex-col items-center justify-center h-full w-full max-w-3xl mx-auto px-4 py-8">
                  <div className="flex flex-col gap-6 w-full">
                    <div className="text-center">
                      <Skeleton className="h-10 w-[60%] mx-auto mb-2" />
                      <Skeleton className="h-4 w-[40%] mx-auto" />
                    </div>
                    <div className="h-32">
                      <Skeleton className="h-full w-full rounded-lg" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 flex-1 rounded-md" />
                        <Skeleton className="h-9 flex-1 rounded-md" />
                        <Skeleton className="h-9 flex-1 rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full max-w-3xl mx-auto bg-background sticky bottom-0 z-10">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </>
        ) : access ? (
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
                  <BreadcrumbPage>{breadcrumbText}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 min-h-0 flex-col gap-4 p-4 pt-0 overflow-x-hidden">
          <div className="flex w-full max-w-3xl mx-auto flex-1 min-h-0 flex-col gap-4 overflow-y-auto overscroll-none">
            {showWelcome ? (
              <ChatWelcome 
                courseName={courseName}
                policy={policy}
                selectedMode={mode}
                onModeChange={setMode}
                courseLoading={courseLoading}
                policyLoading={policyLoading}
              />
            ) : (
              <MessageLog 
                messages={displayMessages}
                isStreaming={showStreaming}
                streamingContent={displayStreamingContent}
              />
            )}
          </div>
          <div className="w-full max-w-3xl mx-auto bg-background sticky bottom-0 z-10">
            <ChatInput 
              value={input} 
              onChange={setInput} 
              onSend={handleSend}
            />
          </div>
        </div>
        </>
        ) : (
          <div className="flex flex-col items-center justify-center h-svh">
            <H1 text="401: Unauthorized."/><Muted text="You do not have access to this course."/>
          </div>
        )}
    </>
  )
}
