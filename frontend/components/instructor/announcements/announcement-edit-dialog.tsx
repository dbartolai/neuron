"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { File as FileIcon, X } from "lucide-react"
import { Announcement, AnnouncementFile } from "@/hooks/use-announcements"
import { useInstructorCourse } from "@/hooks/use-instructor-course"
import { Spinner } from "@/components/ui/spinner"

interface Props {
  announcement: Announcement
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string, content: string, fileIds: string[]) => Promise<void>
}

export function AnnouncementEditDialog({ announcement, open, onOpenChange, onSave }: Props) {
  const { files } = useInstructorCourse(announcement.course_id)
  const [title, setTitle] = useState(announcement.title)
  const [content, setContent] = useState(announcement.content)
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(
    announcement.files?.map((f) => f.id) || []
  )
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(announcement.title)
      setContent(announcement.content)
      setSelectedFileIds(announcement.files?.map((f) => f.id) || [])
    }
  }, [open, announcement])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(title, content, selectedFileIds)
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving announcement:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleFile = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Announcement</DialogTitle>
          <DialogDescription>
            Update the content and file attachments for this announcement
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              placeholder="Enter announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-content">Content</Label>
            <Textarea
              id="edit-content"
              placeholder="Write your announcement here... (Markdown supported)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>
          
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Attach Files</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                  >
                    <Checkbox
                      checked={selectedFileIds.includes(file.id)}
                      onCheckedChange={() => toggleFile(file.id)}
                    />
                    <FileIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedFileIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFileIds.map((fileId) => {
                const file = files.find((f) => f.id === fileId)
                if (!file) return null
                return (
                  <div
                    key={fileId}
                    className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                  >
                    <FileIcon className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      onClick={() => toggleFile(fileId)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim() || !content.trim()}>
            {isSaving && (
              <span className="mr-2">
                <Spinner className="size-4" />
              </span>
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
