"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useParams, useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import React from "react"


// This card displays priority interactions with students
// * If a student recently added the course and needs to be approved
// * If a student asked a question and marked something for instructor review
// * If a student made some kind of post/message to instructors
// * If a student is making many problematic message requests

interface InboxItem {
  id: string
  type: 'join_request' | 'discussion_post' | 'review_request' | 'problematic_activity'
  studentId: string
  studentName: string
  message: string
  timestamp: Date
  priority: 'high' | 'medium' | 'low'
}

interface InboxCardProps {
  courseId: string
}

export function InboxCard({ courseId }: InboxCardProps) {
  const router = useRouter();
  // Placeholder for future inbox items - empty for now
  const inboxItems: InboxItem[] = [];

  return (
    <Card className="w-full max-w-md bg-card h-min">
      <CardHeader>
        <CardTitle>Inbox</CardTitle>
        <CardDescription>
          Priority interactions with students requiring your attention.
        </CardDescription>
        <CardAction>
          <Button 
            variant="ghost"
            onClick={() => router.push(`/instructor/students?courseId=${courseId}`)}
          >
            <ExternalLink/>
          </Button>
        </CardAction>
      </CardHeader>
      <Separator orientation="horizontal"/>
      <CardContent>
        {inboxItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No priority items at this time.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Discussion posts, join requests, and review requests will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {inboxItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.studentName}</div>
                  <div className="text-xs text-muted-foreground">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
