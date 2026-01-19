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
import { toast } from "sonner"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { ChatRole } from "@/hooks/use-chat"

type FeedbackDialogProps = {
  chatId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFeedbackSubmit?: () => void
  type?: ChatRole
}

export default function FeedbackDialog({
  chatId,
  open,
  onOpenChange,
  onFeedbackSubmit,
  type = ChatRole.ASSISTANT,
}: FeedbackDialogProps) {
  const [feedbackCeria, setFeedbackCeria] = useState("")
  const [feedbackInstructor, setFeedbackInstructor] = useState("")
  const [feedbackCombined, setFeedbackCombined] = useState("")
  const [loading, setLoading] = useState(false)
  
  const isSystemMessage = type === ChatRole.SYSTEM

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
            if (isSystemMessage) {
              // For system messages, use either field (they should be the same)
              setFeedbackCombined(data.feedback_ceria || data.feedback_instructor || "")
            } else {
              setFeedbackCeria(data.feedback_ceria || "")
              setFeedbackInstructor(data.feedback_instructor || "")
            }
          }
        } catch (err) {
          // Silently fail
          console.error("Failed to fetch feedback:", err)
        }
      }

      fetchFeedback()
    }
  }, [open, chatId, type])

  const handleSubmit = async () => {
    // Validate that at least one field is filled
    if (isSystemMessage) {
      if (!feedbackCombined.trim()) {
        toast.error("Please provide feedback")
        return
      }
    } else {
      if (!feedbackCeria.trim() && !feedbackInstructor.trim()) {
        toast.error("Please provide at least one feedback")
        return
      }
    }

    setLoading(true)
    try {
      const token = await getAccessToken()
      const body = isSystemMessage
        ? {
            chat_id: chatId,
            feedback_ceria: feedbackCombined.trim() || null,
            feedback_instructor: feedbackCombined.trim() || null,
            type: type,
          }
        : {
            chat_id: chatId,
            feedback_ceria: feedbackCeria.trim() || null,
            feedback_instructor: feedbackInstructor.trim() || null,
            type: type,
          }
      
      const res = await fetch(`${getApiUrl()}/chat/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
            {isSystemMessage
              ? "Share your thoughts about this system message to help us improve."
              : "Share your thoughts about this response to help us improve. At least one field is required."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isSystemMessage ? (
            <div className="space-y-2">
              <Label htmlFor="feedback-combined">Feedback</Label>
              <Textarea
                id="feedback-combined"
                placeholder="Enter your feedback..."
                value={feedbackCombined}
                onChange={(e) => setFeedbackCombined(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="feedback-ceria">Feedback for Ceria (optional)</Label>
                <Textarea
                  id="feedback-ceria"
                  placeholder="Enter your feedback for Ceria..."
                  value={feedbackCeria}
                  onChange={(e) => setFeedbackCeria(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-instructor">Feedback for Instructor (optional)</Label>
                <Textarea
                  id="feedback-instructor"
                  placeholder="Enter your feedback for Instructor..."
                  value={feedbackInstructor}
                  onChange={(e) => setFeedbackInstructor(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </>
          )}
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
