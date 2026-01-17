"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAccessToken } from "@/lib/supabase/client"
import { useInsights } from "@/hooks/use-insights"
import { useRouter } from "next/navigation"

interface Thread {
  id: string
  title: string
  thread_tag: string | null
}

interface ThreadListProps {
  threads: Thread[]
  courseId: string
}

export function ThreadList({ threads, courseId }: ThreadListProps) {
  const router = useRouter()
  const { status, updateThreadTag, refresh } = useInsights(courseId)
  const [updating, setUpdating] = useState<string | null>(null)

  const handleTagChange = async (threadId: string, newTag: string) => {
    setUpdating(threadId)
    try {
      await updateThreadTag(threadId, newTag)
      await refresh()
    } catch (e) {
      console.error("Failed to update thread tag", e)
    } finally {
      setUpdating(null)
    }
  }

  const handleThreadClick = (threadId: string) => {
    // Navigate to thread - need to find which course/thread route to use
    // For now, we'll just log it
    router.push(`/chat/${courseId}/${threadId}`)
  }

  if (threads.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No threads in this category
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {threads.map((thread) => (
        <div
          key={thread.id}
          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
        >
          <button
            onClick={() => handleThreadClick(thread.id)}
            className="flex-1 text-left text-sm hover:underline"
          >
            {thread.title}
          </button>
          {status?.thread_tags && (
            <Select
              value={thread.thread_tag || ""}
              onValueChange={(value) => handleTagChange(thread.id, value)}
              disabled={updating === thread.id}
            >
              <SelectTrigger className="w-40 ml-2">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                {status.thread_tags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ))}
    </div>
  )
}
