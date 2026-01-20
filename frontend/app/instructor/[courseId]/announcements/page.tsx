"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { H1 } from "@/components/primitives"
import { useAnnouncements } from "@/hooks/use-announcements"
import { AnnouncementCard } from "@/components/instructor/announcements/announcement-card"
import { AnnouncementEditDialog } from "@/components/instructor/announcements/announcement-edit-dialog"
import { AnnouncementInputCard } from "@/components/instructor/announcements/announcement-input-card"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AnnouncementsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const router = useRouter()
  const { announcements, isLoading, error, refetch, updateAnnouncement, deleteAnnouncement } = useAnnouncements(courseId as string, true)
  const [editingAnnouncement, setEditingAnnouncement] = useState<string | null>(null)
  const [showCreateCard, setShowCreateCard] = useState(false)

  const handleEdit = (announcement: any) => {
    setEditingAnnouncement(announcement.id)
  }

  const handleSaveEdit = async (title: string, content: string, fileIds: string[]) => {
    if (!editingAnnouncement) return
    try {
      await updateAnnouncement(editingAnnouncement, title, content, fileIds)
      setEditingAnnouncement(null)
      toast.success("Announcement updated successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to update announcement")
      throw error
    }
  }

  const handleDelete = async (announcement: any) => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return
    }
    try {
      await deleteAnnouncement(announcement.id)
      toast.success("Announcement deleted successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete announcement")
    }
  }

  const editingAnnouncementData = editingAnnouncement
    ? announcements.find((a) => a.id === editingAnnouncement)
    : null

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <div className="flex items-center justify-between">
          <H1 text="Announcements" />
          <Button onClick={() => setShowCreateCard(!showCreateCard)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Announcement
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4 pt-0 max-w-4xl mx-auto w-full">
        {showCreateCard && (
          <AnnouncementInputCard
            onPostSuccess={() => {
              setShowCreateCard(false)
              refetch()
            }}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No announcements yet. Create your first one!
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={() => handleEdit(announcement)}
                onDelete={() => handleDelete(announcement)}
              />
            ))}
          </div>
        )}

        {editingAnnouncementData && (
          <AnnouncementEditDialog
            announcement={editingAnnouncementData}
            open={!!editingAnnouncement}
            onOpenChange={(open) => !open && setEditingAnnouncement(null)}
            onSave={handleSaveEdit}
          />
        )}
      </div>
    </>
  )
}
