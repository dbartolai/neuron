"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getAccessToken } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { H1, Muted } from "@/components/primitives"
import { Download, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"

export default function FileViewerPage() {
  const { fileId } = useParams<{ fileId: string }>()
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [mimeType, setMimeType] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string>("")

  useEffect(() => {
    const fetchFileUrl = async () => {
      try {
        setLoading(true)
        const token = await getAccessToken()
        
        // Get file metadata and signed URL
        const urlRes = await fetch(
          `http://localhost:8000/instructor/files/${fileId}/url`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!urlRes.ok) {
          throw new Error("Failed to fetch file")
        }

        const data = await urlRes.json()
        setFileUrl(data.url)
        setFileName(data.file.name)
        setMimeType(data.file.mime_type)

        // If it's a text/markdown file, fetch the content
        if (data.file.mime_type === "text/markdown" || data.file.mime_type.startsWith("text/")) {
          const contentRes = await fetch(data.url)
          if (contentRes.ok) {
            const content = await contentRes.text()
            setTextContent(content)
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load file")
      } finally {
        setLoading(false)
      }
    }

    if (fileId) {
      fetchFileUrl()
    }
  }, [fileId])

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement("a")
      link.href = fileUrl
      link.download = fileName
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const renderFileContent = () => {
    if (!fileUrl) return null

    // PDF files
    if (mimeType === "application/pdf") {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[calc(100vh-200px)] border rounded-lg"
          title={fileName}
        />
      )
    }

    // Markdown files
    if (mimeType === "text/markdown" && textContent) {
      return (
        <div className="prose prose-invert max-w-none w-full bg-card rounded-lg p-6 overflow-auto max-h-[calc(100vh-200px)]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {textContent}
          </ReactMarkdown>
        </div>
      )
    }

    // Plain text files
    if (mimeType.startsWith("text/") && textContent) {
      return (
        <div className="w-full bg-card rounded-lg p-6 overflow-auto max-h-[calc(100vh-200px)]">
          <pre className="whitespace-pre-wrap font-mono text-sm">{textContent}</pre>
        </div>
      )
    }

    // DOCX and PPTX - show download option
    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] bg-card rounded-lg">
          <p className="text-muted-foreground mb-4">
            This file type cannot be displayed inline. Please download to view.
          </p>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download {fileName}
          </Button>
        </div>
      )
    }

    // Fallback - try to display or show download
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] bg-card rounded-lg">
        <p className="text-muted-foreground mb-4">
          Preview not available for this file type.
        </p>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download {fileName}
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <Muted text="Loading file..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <H1 text="Error" />
        <Muted text={error} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex flex-col">
          <H1 text={fileName} />
        </div>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </header>
      <div className="flex-1 overflow-hidden p-4">
        {renderFileContent()}
      </div>
    </div>
  )
}
