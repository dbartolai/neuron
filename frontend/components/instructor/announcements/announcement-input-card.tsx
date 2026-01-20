"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useParams } from "next/navigation"
import { useAnnouncements } from "@/hooks/use-announcements"
import { useInstructorCourse } from "@/hooks/use-instructor-course"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { File as FileIcon, X } from "lucide-react"

interface Props {
  onPostSuccess?: () => void
}

export function AnnouncementInputCard({ onPostSuccess }: Props) {
  const { courseId } = useParams<{ courseId: string }>()
  const { files, refetchFiles } = useInstructorCourse(courseId as string)
  const { createAnnouncement } = useAnnouncements(courseId as string, true)
  
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [isPosting, setIsPosting] = useState(false)

  const handlePost = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }
    if (!content.trim()) {
      toast.error("Please enter announcement content")
      return
    }

    setIsPosting(true)
    try {
      await createAnnouncement(title, content, selectedFileIds.length > 0 ? selectedFileIds : undefined)
      setTitle("")
      setContent("")
      setSelectedFileIds([])
      if (onPostSuccess) {
        onPostSuccess()
      }
      toast.success("Announcement posted successfully!")
    } catch (error: any) {
      console.error("Error posting announcement:", error)
      toast.error(error?.message || "Failed to post announcement")
    } finally {
      setIsPosting(false)
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
    <Card className="w-full bg-card mb-8">
      <CardHeader>
        <CardTitle>Create Announcement</CardTitle>
        <CardDescription>
          Share updates and information with your students
        </CardDescription>
      </CardHeader>
      <Separator orientation="horizontal" />
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="announcement-title">Title</Label>
          <Input
            id="announcement-title"
            placeholder="Enter announcement title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="announcement-content">Content</Label>
          <Textarea
            id="announcement-content"
            placeholder="Write your announcement here... (Markdown supported)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>
        
        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Attach Files (Optional)</Label>
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
      </CardContent>
      <CardFooter>
        <Button
          onClick={handlePost}
          className="w-full relative"
          disabled={isPosting || !title.trim() || !content.trim()}
        >
          {isPosting && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner className="size-4" />
            </span>
          )}
          <span className={isPosting ? "invisible" : ""}>Post Announcement</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
