"use client"

import SystemMessageFeedbackMenu from "./system-message-feedback-menu"

type SystemMessageProps = {
  content: string
  chatId?: string
  showFeedback?: boolean
  lastUserMessage?: string | null
  onStartEdit?: () => void
}

export default function SystemMessage({ 
  content, 
  chatId, 
  showFeedback = true,
  lastUserMessage,
  onStartEdit
}: SystemMessageProps) {
  return (
    <div className="flex flex-col items-center my-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 max-w-lg text-center">
        <p className="text-red-400 text-sm">{content}</p>
      </div>
      {chatId && showFeedback && onStartEdit && (
        <SystemMessageFeedbackMenu
          chatId={chatId}
          onStartEdit={onStartEdit}
          lastUserMessage={lastUserMessage || null}
        />
      )}
    </div>
  )
}
