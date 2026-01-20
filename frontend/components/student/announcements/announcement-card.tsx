"use client"

import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { File as FileIcon, ExternalLink } from "lucide-react"
import { Announcement } from "@/hooks/use-announcements"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { ReactionButtons } from "./reaction-buttons"
import { markAsSeen } from "@/hooks/use-announcement-seen"

interface Props {
  announcement: Announcement
}

export function StudentAnnouncementCard({ announcement }: Props) {
  const createdDate = new Date(announcement.created_at)

  useEffect(() => {
    // Mark announcement as seen when card is rendered
    markAsSeen(announcement.id).catch((error) => {
      console.error("Error marking announcement as seen:", error)
    })
  }, [announcement.id])

  return (
    <Card className="w-full">
      <CardHeader className="mb-0">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold font-serif flex-1">{announcement.title}</h2>
          <div className="text-sm text-muted-foreground">
            {formatDistanceToNow(createdDate, { addSuffix: true })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 mt-0">
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-3xl font-bold font-serif mt-6 mb-4 text-foreground leading-tight" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-2xl font-semibold font-serif mt-5 mb-3 text-foreground leading-tight" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-xl font-semibold mt-4 mb-2 text-foreground leading-tight" {...props} />
              ),
              h4: ({ node, ...props }) => (
                <h4 className="text-lg font-semibold mt-3 mb-2 text-foreground leading-tight" {...props} />
              ),
              h5: ({ node, ...props }) => (
                <h5 className="text-base font-semibold mt-3 mb-1 text-foreground leading-tight" {...props} />
              ),
              h6: ({ node, ...props }) => (
                <h6 className="text-sm font-semibold mt-2 mb-1 text-foreground leading-tight" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="mt-6 mb-4 text-foreground leading-7" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="my-4 ml-6 list-disc marker:text-muted-foreground text-foreground space-y-2 leading-7" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="my-4 ml-6 list-decimal marker:text-muted-foreground text-foreground space-y-2 leading-7" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-foreground leading-7" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-foreground" {...props} />
              ),
              em: ({ node, ...props }) => (
                <em className="italic text-foreground" {...props} />
              ),
              hr: ({ node, ...props }) => (
                <hr className="my-6 border-border" {...props} />
              ),
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "")
                const isInline = !match && !String(children).includes("\n")

                return isInline ? (
                  <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className={`${className} text-sm`} {...props}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {announcement.content}
          </ReactMarkdown>
        </div>

        {announcement.files && announcement.files.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Attached Files</div>
            <div className="space-y-2">
              {announcement.files.map((file) => (
                <Link
                  key={file.id}
                  href={`/file/${file.id}`}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
                >
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <ReactionButtons announcementId={announcement.id} />
        </div>
      </CardContent>
    </Card>
  )
}
