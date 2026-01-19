"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import MessageLog from "@/components/chat/message-log"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ChatRole } from "@/hooks/use-chat"

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

function InstructorThreadViewContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const studentId = params.studentId as string
  const threadId = params.threadId as string
  const courseId = searchParams.get("courseId")

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [threadName, setThreadName] = useState<string>("")
  const [studentName, setStudentName] = useState<string>("")

  useEffect(() => {
    if (!threadId) {
      setError("Thread ID is required")
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchMessages = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = await getAccessToken()
        
        // Fetch student name if courseId is available
        if (courseId) {
          try {
            const studentRes = await fetch(
              `${getApiUrl()}/instructor/courses/${courseId}/enrollment`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                signal: controller.signal,
              }
            )

            if (studentRes.ok) {
              const students: Array<{ id: string; name: string }> = await studentRes.json()
              const foundStudent = students.find((s) => s.id === studentId)
              if (foundStudent) {
                setStudentName(foundStudent.name)
              }
            }
          } catch (e) {
            // Silently fail - student name is not critical
            console.error("Failed to fetch student name:", e)
          }
        }
        
        // Fetch thread name
        const nameRes = await fetch(
          `${getApiUrl()}/chat/${threadId}/name`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        )

        if (nameRes.ok) {
          const name = await nameRes.text()
          setThreadName(name)
        }

        // Fetch messages
        const res = await fetch(`${getApiUrl()}/chat/${threadId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error("Failed to fetch messages")
        }

        const data: ChatMessage[] = await res.json()
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        )
      } catch (e: any) {
        if (e?.name === "AbortError") return
        setError(e.message || "Failed to load messages")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchMessages()

    return () => controller.abort()
  }, [threadId, courseId, studentId])

  const handleBack = () => {
    if (courseId) {
      router.push(`/instructor/students/${studentId}?courseId=${courseId}`)
    } else {
      router.push(`/instructor/students/${studentId}`)
    }
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
                <BreadcrumbLink onClick={handleBack} className="cursor-pointer">
                  {loading ? <Skeleton className="h-4 w-24 inline-block" /> : studentName || "Student"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {loading ? <Skeleton className="h-4 w-32" /> : threadName || "Thread"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-none chat-scroll">
          <div className="mx-auto w-full max-w-3xl px-4 mb-10">
            {loading ? (
              <div className="space-y-4 py-8">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : error ? (
              <div className="text-destructive py-8">{error}</div>
            ) : (
              <MessageLog 
                messages={messages} 
                isStreaming={false}
                streamingContent=""
                threadId={threadId}
                showFeedback={false}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function LoadingFallback() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Skeleton className="h-4 w-48" />
        </div>
      </header>
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-none chat-scroll">
          <div className="mx-auto w-full max-w-3xl px-4 py-8">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </>
  )
}

export default function InstructorThreadView() {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <Suspense fallback={<LoadingFallback />}>
        <InstructorThreadViewContent />
      </Suspense>
    </div>
  )
}
