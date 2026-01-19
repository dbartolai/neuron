"use client"

import { useState, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type UserMessageProps = {
  content: string
  isEditing?: boolean
  onEditSubmit?: (editedContent: string) => void
  onEditCancel?: () => void
}

export default function UserMessage({ 
  content, 
  isEditing = false,
  onEditSubmit,
  onEditCancel
}: UserMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editedContent, setEditedContent] = useState(content)

  // Update editedContent when content changes (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(content)
    }
  }, [content, isEditing])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success("Message copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy message")
    }
  }

  const handleSubmit = () => {
    if (editedContent.trim() && onEditSubmit) {
      onEditSubmit(editedContent.trim())
    }
  }

  const handleCancel = () => {
    setEditedContent(content)
    if (onEditCancel) {
      onEditCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex justify-end my-4">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] w-full">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmit()
              } else if (e.key === "Escape") {
                handleCancel()
              }
            }}
            className="bg-transparent border-none text-primary-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[60px] whitespace-pre-wrap"
            placeholder="Edit your message..."
            autoFocus
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/10"
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSubmit}
              disabled={!editedContent.trim()}
              className="h-7 text-xs text-primary-foreground hover:bg-primary-foreground/10"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="flex justify-end my-4 group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
      {isHovered && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="absolute right-0 -bottom-6 h-6 w-6 opacity-70 hover:opacity-100 z-10"
          aria-label="Copy message"
        >
          {copied ? (
            <Check className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
        </Button>
      )}
    </div>
  )
}