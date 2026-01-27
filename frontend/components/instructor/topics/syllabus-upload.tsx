"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, FileText } from "lucide-react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  courseId: string
  onTopicsGenerated: (topics: string[]) => void
  hasTopics?: boolean
}

export function SyllabusUpload({ courseId, onTopicsGenerated, hasTopics = false }: Props) {
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(selectedFiles)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select a file")
      return
    }

    setUploading(true)
    try {
      const token = await getAccessToken()
      const formData = new FormData()
      
      files.forEach((file) => {
        formData.append("files", file)
      })

      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Failed to upload file")
      }

      const fileIds = await res.json()
      if (fileIds.length > 0) {
        setUploadedFileId(fileIds[0])
        toast.success("File uploaded successfully")
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateTopics = async () => {
    if (!uploadedFileId) {
      toast.error("Please upload a file first")
      return
    }

    setGenerating(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(
        `${getApiUrl()}/instructor/courses/${courseId}/topics/generate-from-syllabus`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ file_id: uploadedFileId }),
        }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to generate topics")
      }

      const data = await res.json()
      setSuggestedTopics(data.suggested_topics || [])
      toast.success("Topics generated successfully")
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate topics")
    } finally {
      setGenerating(false)
    }
  }

  const handleAcceptTopics = () => {
    if (suggestedTopics.length > 0) {
      onTopicsGenerated(suggestedTopics)
      setSuggestedTopics([])
      setUploadedFileId(null)
      setFiles([])
      setDialogOpen(false)
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setDialogOpen(false)
      setSuggestedTopics([])
      setUploadedFileId(null)
      setFiles([])
    }
  }

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={handleFileSelect}
          className="hidden"
          id="syllabus-upload"
          disabled={uploading || generating}
        />
        <label htmlFor="syllabus-upload">
          <Button variant="outline" asChild disabled={uploading || generating}>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Select Syllabus File
            </span>
          </Button>
        </label>
        {files.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            {files.map((f) => f.name).join(", ")}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleUpload} disabled={files.length === 0 || uploading || generating}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload File"
          )}
        </Button>
        {uploadedFileId && (
          <Button onClick={handleGenerateTopics} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Topics"
            )}
          </Button>
        )}
      </div>

      {suggestedTopics.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div className="text-sm font-medium">Suggested Topics:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedTopics.map((topic, idx) => (
              <div
                key={idx}
                className="px-3 py-1 bg-muted rounded-md text-sm"
              >
                {topic}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAcceptTopics} size="sm">
              Accept All Topics
            </Button>
            <Button
              onClick={() => setSuggestedTopics([])}
              variant="outline"
              size="sm"
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (hasTopics) {
    return (
      <>
        <Button variant="outline" onClick={() => setDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Generate Topics from Syllabus
        </Button>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Topics from Syllabus</DialogTitle>
              <DialogDescription>
                Upload a syllabus file to automatically extract topic suggestions
              </DialogDescription>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Topics from Syllabus</CardTitle>
        <CardDescription>
          Upload a syllabus file to automatically extract topic suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}
