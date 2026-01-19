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
import { toast } from "sonner"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

type FeedbackDialogProps = {
  chatId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFeedbackSubmit?: () => void
}

export default function FeedbackDialog({
  chatId,
  open,
  onOpenChange,
  onFeedbackSubmit,
}: FeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState("")
  const [loading, setLoading] = useState(false)

  // Fetch existing feedback when dialog opens
  useEffect(() => {
    if (open && chatId) {
      const fetchFeedback = async () => {
        try {
          const token = await getAccessToken()
          const res = await fetch(`${getApiUrl()}/chat/${chatId}/feedback`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (res.ok) {
            const data = await res.json()
            setFeedbackText(data.feedback || "")
          }
        } catch (err) {
          // Silently fail
          console.error("Failed to fetch feedback:", err)
        }
      }

      fetchFeedback()
    }
  }, [open, chatId])

  const handleSubmit = async () => {
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
          feedback: feedbackText || null,
        }),
      })

      if (res.ok) {
        toast.success("Feedback submitted successfully")
        onOpenChange(false)
        if (onFeedbackSubmit) {
          onFeedbackSubmit()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>
            Share your thoughts about this response to help us improve.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Enter your feedback..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
