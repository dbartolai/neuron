"use client"

import { useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { H1 } from "@/components/primitives"
import { useParams } from "next/navigation"
import { useAnnouncements } from "@/hooks/use-announcements"
import { StudentAnnouncementCard } from "@/components/student/announcements/announcement-card"
import { markAllAsSeen } from "@/hooks/use-announcement-seen"
import { Loader2 } from "lucide-react"

export default function StudentAnnouncementsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { announcements, isLoading, error } = useAnnouncements(courseId as string, false)

  useEffect(() => {
    // Mark all announcements as seen when page loads
    if (courseId && !isLoading) {
      markAllAsSeen(courseId as string).catch((error) => {
        console.error("Error marking all announcements as seen:", error)
      })
    }
  }, [courseId, isLoading])

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <H1 text="Announcements" />
      </div>
      <div className="flex flex-col gap-4 p-4 pt-0 max-w-4xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No announcements yet.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <StudentAnnouncementCard key={announcement.id} announcement={announcement} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
