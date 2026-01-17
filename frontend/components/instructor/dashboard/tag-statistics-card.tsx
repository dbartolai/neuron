"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { ThreadList } from "./thread-list"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiUrl } from "@/lib/utils"

interface TagStatisticsCardProps {
  tag: string
  count: number
  percentage: number
  courseId: string
}

export function TagStatisticsCard({ tag, count, percentage, courseId }: TagStatisticsCardProps) {
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && threads.length === 0) {
      fetchThreads()
    }
  }, [open])

  const fetchThreads = async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(
        `${getApiUrl()}/instructor/courses/${courseId}/insights/threads?tag=${encodeURIComponent(tag)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
      }
    } catch (e) {
      console.error("Failed to fetch threads", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{tag}</CardTitle>
                <CardDescription>
                  {count} threads ({percentage}%)
                </CardDescription>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <p className="text-sm text-muted-foreground">Loading threads...</p>
              </div>
            ) : (
              <ThreadList threads={threads} courseId={courseId} />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
