"use client"

import { useState, useEffect } from "react"
import { Copy, ThumbsUp, ThumbsDown, MessageSquare, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import FeedbackDialog from "./feedback-dialog"
import { ChatRole } from "@/hooks/use-chat"

type FeedbackMenuProps = {
  chatId: string
  content: string
  onTryAgain?: () => void
  onFeedbackSubmit?: () => void
  type?: ChatRole
}

interface FeedbackData {
  thumbs_up: boolean
  thumbs_down: boolean
  feedback: string | null
}

export default function FeedbackMenu({ chatId, content, onTryAgain, onFeedbackSubmit, type = ChatRole.ASSISTANT }: FeedbackMenuProps) {
  const [thumbsUp, setThumbsUp] = useState(false)
  const [thumbsDown, setThumbsDown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)

  // Fetch existing feedback on mount
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const token = await getAccessToken()
        const res = await fetch(`${getApiUrl()}/chat/${chatId}/feedback`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data: FeedbackData = await res.json()
          setThumbsUp(data.thumbs_up)
          setThumbsDown(data.thumbs_down)
        }
      } catch (err) {
        // Silently fail - feedback is optional
        console.error("Failed to fetch feedback:", err)
      }
    }

    if (chatId) {
      fetchFeedback()
    }
  }, [chatId])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success("Message copied to clipboard")
    } catch (err) {
      toast.error("Failed to copy message")
    }
  }

  const handleThumbsUp = async () => {
    const newValue = !thumbsUp
    setLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/chat/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          thumbs_up: newValue,
          thumbs_down: false,
          type: type,
        }),
      })

      if (res.ok) {
        setThumbsUp(newValue)
        if (newValue) {
          setThumbsDown(false)
          toast.success("Thanks for your feedback!")
        }
      } else {
        toast.error("Failed to submit feedback")
      }
    } catch (err) {
      toast.error("Failed to submit feedback")
    } finally {
      setLoading(false)
    }
  }

  const handleThumbsDown = async () => {
    const newValue = !thumbsDown
    setLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/chat/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          thumbs_up: false,
          thumbs_down: newValue,
          type: type,
        }),
      })

      if (res.ok) {
        setThumbsDown(newValue)
        if (newValue) {
          setThumbsUp(false)
          toast.success("Thanks for your feedback!")
        }
      } else {
        toast.error("Failed to submit feedback")
      }
    } catch (err) {
      toast.error("Failed to submit feedback")
    } finally {
      setLoading(false)
    }
  }

  const handleFeedbackClick = () => {
    setFeedbackDialogOpen(true)
  }

  const handleTryAgain = () => {
    if (onTryAgain) {
      onTryAgain()
    }
  }

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="h-6 w-6 opacity-70 hover:opacity-100"
          aria-label="Copy message"
        >
          <Copy className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleThumbsUp}
          disabled={loading}
          className={`h-6 w-6 opacity-70 hover:opacity-100 ${thumbsUp ? "opacity-100" : ""}`}
          aria-label="Thumbs up"
        >
          {thumbsUp ? (
            <ThumbsUp className="size-3 fill-current" />
          ) : (
            <ThumbsUp className="size-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleThumbsDown}
          disabled={loading}
          className={`h-6 w-6 opacity-70 hover:opacity-100 ${thumbsDown ? "opacity-100" : ""}`}
          aria-label="Thumbs down"
        >
          {thumbsDown ? (
            <ThumbsDown className="size-3 fill-current" />
          ) : (
            <ThumbsDown className="size-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleFeedbackClick}
          className="h-6 w-6 opacity-70 hover:opacity-100"
          aria-label="Provide feedback"
        >
          <MessageSquare className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleTryAgain}
          className="h-6 w-6 opacity-70 hover:opacity-100"
          aria-label="Try again"
        >
          <RotateCw className="size-3" />
        </Button>
      </div>
      {feedbackDialogOpen && (
        <FeedbackDialog
          chatId={chatId}
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          onFeedbackSubmit={onFeedbackSubmit}
          type={type}
        />
      )}
    </>
  )
}
