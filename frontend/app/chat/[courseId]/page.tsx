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
import { Mail } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useUnseenCount } from "@/hooks/use-announcement-seen"

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
  const { count: unseenCount, refetch: refetchUnseenCount } = useUnseenCount(courseId);
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
  
  // Track violation metadata for system messages (keyed by system message ID)
  const violationMetadataRef = useRef<Map<string, {hasFallback: boolean, originalMessage: string}>>(new Map());
  const isErrorResponseRef = useRef<boolean>(false);

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
          } else if (event.event === 'violation') {
            try {
              const data = JSON.parse(event.data);
              // Store violation metadata for later use
              if (data.has_fallback && data.system_message_id && data.original_message) {
                violationMetadataRef.current.set(data.system_message_id, {
                  hasFallback: data.has_fallback,
                  originalMessage: data.original_message
                });
              }
              // Mark as error response (rule violation) so we know to split tokens
              isErrorResponseRef.current = true;
            } catch (e) {
              // Ignore parse errors
            }
          } else if (event.event === 'error') {
            try {
              const data = JSON.parse(event.data);
              // Mark as error response (rule violation)
              isErrorResponseRef.current = true;
              // Split error message into words for smooth animation
              const words = data.message.split(' ');
              for (let i = 0; i < words.length; i++) {
                tokenQueueRef.current.push(words[i] + (i < words.length - 1 ? ' ' : ''));
              }
            } catch (e) {
              // Ignore parse errors
            }
          } else if (event.event === 'token') {
            try {
              const data = JSON.parse(event.data);
              // If this is a violation response, split the token content into words for smooth streaming
              if (isErrorResponseRef.current && data.content) {
                // Split large token content into words for smooth animation
                const words = data.content.split(' ');
                for (let i = 0; i < words.length; i++) {
                  tokenQueueRef.current.push(words[i] + (i < words.length - 1 ? ' ' : ''));
                }
              } else {
                // Normal token streaming
                tokenQueueRef.current.push(data.content);
              }
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
      // Check if this was an error response (rule violation)
      const messageRole = isErrorResponseRef.current ? ChatRole.SYSTEM : ChatRole.ASSISTANT;
      // Try to find system message ID from violation metadata
      let systemMessageId: string | undefined = undefined;
      if (isErrorResponseRef.current) {
        const violationEntries = Array.from(violationMetadataRef.current.entries());
        if (violationEntries.length > 0) {
          systemMessageId = violationEntries[violationEntries.length - 1][0];
        }
      }
      setLocalMessages([
        { role: ChatRole.STUDENT, content: messageContent },
        { id: systemMessageId, role: messageRole, content: finalContent }
      ]);
      setIsStreaming(false);
      setIsCreating(false);
      setStreamingContent("");
      isErrorResponseRef.current = false;

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
  
  // Fallback function for course page (when thread doesn't exist yet)
  const useFallbackLocal = useCallback(async (originalMessage: string, systemMessageId: string) => {
    if (!threadIdRef.current) return;
    
    setIsStreaming(true);
    setStreamingContent("");
    
    // Reset token queue for new stream
    tokenQueueRef.current = [];
    fullContentRef.current = "";
    isErrorResponseRef.current = false;
    startDraining();
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      const token = await getAccessToken();
      
      const res = await fetch(`${getApiUrl()}/chat/fallback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          thread_id: threadIdRef.current,
          original_message: originalMessage,
          system_message_id: systemMessageId
        }),
        signal: controller.signal,
      });
      
      if (!res.ok) {
        throw new Error(`Fallback request failed: ${res.status}`);
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
          if (event.event === 'token') {
            try {
              const data = JSON.parse(event.data);
              tokenQueueRef.current.push(data.content);
            } catch (e) {
              // Ignore parse errors
            }
          } else if (event.event === 'error') {
            try {
              const data = JSON.parse(event.data);
              isErrorResponseRef.current = true;
              const words = data.message.split(' ');
              for (let i = 0; i < words.length; i++) {
                tokenQueueRef.current.push(words[i] + (i < words.length - 1 ? ' ' : ''));
              }
            } catch (e) {
              // Ignore parse errors
            }
          } else if (event.event === 'done') {
            break;
          }
        }
        
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
      
      // Update local messages with fallback response
      const finalContent = fullContentRef.current;
      const messageRole = isErrorResponseRef.current ? ChatRole.SYSTEM : ChatRole.ASSISTANT;
      setLocalMessages((prev) => [
        ...prev,
        { role: messageRole, content: finalContent }
      ]);
      
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        stopDraining();
        tokenQueueRef.current = [];
        fullContentRef.current = "";
        return;
      }
      console.error("Error in fallback:", err);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  }, [startDraining, stopDraining]);
  
  const getViolationMetadataLocal = useCallback((messageId?: string): {hasFallback: boolean, originalMessage: string} | null => {
    if (!messageId) return null;
    return violationMetadataRef.current.get(messageId) || null;
  }, []);
  
  // Merged getViolationMetadata that checks both local and useChat's refs
  const getViolationMetadataMerged = useCallback((messageId?: string): {hasFallback: boolean, originalMessage: string} | null => {
    if (!messageId) return null;
    // First check local ref (for messages created during thread creation)
    const localMeta = violationMetadataRef.current.get(messageId);
    if (localMeta) return localMeta;
    // Then check useChat's ref (for messages loaded from server)
    if (activeThreadId && chat.getViolationMetadata) {
      return chat.getViolationMetadata(messageId);
    }
    return null;
  }, [activeThreadId, chat]);
  
  // Merged useFallback that tries chat's fallback first, then local fallback
  const useFallbackMerged = useCallback(async (originalMessage: string, systemMessageId: string) => {
    // Try chat's fallback first if available and thread is active
    if (activeThreadId && chat.useFallback) {
      return chat.useFallback(originalMessage, systemMessageId);
    }
    // Fall back to local fallback
    return useFallbackLocal(originalMessage, systemMessageId);
  }, [activeThreadId, chat, useFallbackLocal]);
  
  // Use merged fallback function
  const useFallback = useFallbackMerged;
  const getViolationMetadata = activeThreadId ? getViolationMetadataMerged : getViolationMetadataLocal;

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
          <div className="flex items-center gap-2 px-4 flex-1">
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
          <div className="px-4">
            <Link href={`/chat/${courseId}/announcements`} onClick={() => refetchUnseenCount()}>
              <div className="relative">
                <button className="p-2 rounded hover:bg-muted transition-colors">
                  <Mail className="h-5 w-5" />
                  <span className="sr-only">Announcements</span>
                </button>
                {unseenCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                  >
                    {unseenCount > 99 ? '99+' : unseenCount}
                  </Badge>
                )}
              </div>
            </Link>
          </div>
        </header>
        <div className="flex flex-1 min-h-0 flex-col gap-4 p-4 pt-0 overflow-x-hidden w-full  chat-scroll">
          <div className="flex w-full  mx-auto flex-1 min-h-0 flex-col gap-4  overflow-y-auto  ">
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
                threadId={activeThreadId || undefined}
                sendMessage={activeThreadId ? chat.sendMessage : undefined}
                useFallback={useFallback}
                getViolationMetadata={getViolationMetadata}
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
