"use client"

import { useState } from "react"
import { Pencil, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import FeedbackDialog from "./feedback-dialog"
import { ChatRole } from "@/hooks/use-chat"

type SystemMessageFeedbackMenuProps = {
  chatId: string
  onStartEdit: () => void
  lastUserMessage: string | null
}

export default function SystemMessageFeedbackMenu({ 
  chatId, 
  onStartEdit,
  lastUserMessage 
}: SystemMessageFeedbackMenuProps) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)

  const handleFeedbackClick = () => {
    setFeedbackDialogOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-center gap-1 mt-2">
        {lastUserMessage && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onStartEdit}
            className="h-6 w-6 opacity-70 hover:opacity-100"
            aria-label="Edit and resend"
          >
            <Pencil className="size-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleFeedbackClick}
          className="h-6 w-6 opacity-70 hover:opacity-100"
          aria-label="Provide feedback"
        >
          <MessageSquare className="size-3" />
        </Button>
      </div>
      {feedbackDialogOpen && (
        <FeedbackDialog
          chatId={chatId}
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          type={ChatRole.SYSTEM}
        />
      )}
    </>
  )
}
