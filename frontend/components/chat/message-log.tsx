"use client"


import { useEffect, useRef, useState } from "react"
import { ChatMessage } from "@/hooks/use-chat"
import {ChatRole} from "@/hooks/use-chat"
import UserMessage from "@/components/chat/user-message"
import AssistantMessage, { ThinkingIndicator } from "./assistant-message"
import SystemMessage from "./system-message"

type MessageLogProps = {
    messages: ChatMessage[]
    isStreaming?: boolean
    streamingContent?: string
    threadId?: string
    sendMessage?: (content: string) => Promise<void>
    showFeedback?: boolean
}



export default function MessageLog( {
    messages, 
    isStreaming = false, 
    streamingContent = "",
    threadId,
    sendMessage,
    showFeedback = true
}: MessageLogProps ) {
    
    // Track which user message is being edited (by message index)
    const [editingUserMessageIndex, setEditingUserMessageIndex] = useState<number | null>(null)
    
    // Auto-scroll to bottom when new messages arrive or streaming content updates
    const bottomRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent, isStreaming])

    // Find the last user message before a given assistant message index
    const findLastUserMessage = (assistantIndex: number): string | null => {
        for (let i = assistantIndex - 1; i >= 0; i--) {
            if (messages[i].role === ChatRole.STUDENT) {
                return messages[i].content
            }
        }
        return null
    }

    // Find the last user message index before a given system message index
    const findLastUserMessageIndexForSystem = (systemIndex: number): number | null => {
        for (let i = systemIndex - 1; i >= 0; i--) {
            if (messages[i].role === ChatRole.STUDENT) {
                return i
            }
        }
        return null
    }

    // Find the last user message before a given system message index
    const findLastUserMessageForSystem = (systemIndex: number): string | null => {
        const index = findLastUserMessageIndexForSystem(systemIndex)
        return index !== null ? messages[index].content : null
    }

    // Handle try again - resend the last user message
    const handleTryAgain = (assistantIndex: number) => {
        if (!sendMessage) return
        
        const lastUserMessage = findLastUserMessage(assistantIndex)
        if (lastUserMessage) {
            sendMessage(lastUserMessage)
        }
    }

    // Handle start editing user message from system message
    const handleStartEditUserMessage = (systemIndex: number) => {
        const userMessageIndex = findLastUserMessageIndexForSystem(systemIndex)
        if (userMessageIndex !== null) {
            setEditingUserMessageIndex(userMessageIndex)
        }
    }

    // Handle edit and resend for user messages
    const handleEditAndResend = (editedMessage: string) => {
        if (!sendMessage) return
        setEditingUserMessageIndex(null)
        sendMessage(editedMessage)
    }

    // Handle cancel editing
    const handleCancelEdit = () => {
        setEditingUserMessageIndex(null)
    }

    return (
        <div className="chat-scroll max-w-3xl mx-auto">
        {messages.map((message: ChatMessage, index: number) => {
            
            if (message.role === ChatRole.STUDENT){
                return (
                    <UserMessage
                        content={message.content}
                        isEditing={editingUserMessageIndex === index}
                        onEditSubmit={handleEditAndResend}
                        onEditCancel={handleCancelEdit}
                        key={message.id || index}
                    />
                )
            } else if (message.role === ChatRole.ASSISTANT) {
                return (
                    <AssistantMessage
                        content={message.content}
                        chatId={message.id}
                        threadId={threadId}
                        onTryAgain={() => handleTryAgain(index)}
                        showFeedback={showFeedback}
                        key={message.id || index}
                    />
                )
            } else if (message.role === ChatRole.SYSTEM) {
                return (
                    <SystemMessage
                        content={message.content}
                        chatId={message.id}
                        showFeedback={showFeedback}
                        lastUserMessage={findLastUserMessageForSystem(index)}
                        onStartEdit={() => handleStartEditUserMessage(index)}
                        key={message.id || index}
                    />
                )
            }
            return null;
        })}
        
        {/* Show streaming content or thinking indicator */}
        {isStreaming && (
            streamingContent ? (
                <AssistantMessage 
                    content={streamingContent} 
                    isStreaming={true}
                />
            ) : (
                <ThinkingIndicator />
            )
        )}
        
        {/* Scroll anchor */}
        <div ref={bottomRef} />
        </div>
        
    )

}
