"use client"


import { useEffect, useRef } from "react"
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
}



export default function MessageLog( {
    messages, 
    isStreaming = false, 
    streamingContent = "",
    threadId,
    sendMessage
}: MessageLogProps ) {
    
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

    // Handle try again - resend the last user message
    const handleTryAgain = (assistantIndex: number) => {
        if (!sendMessage) return
        
        const lastUserMessage = findLastUserMessage(assistantIndex)
        if (lastUserMessage) {
            sendMessage(lastUserMessage)
        }
    }

    return (
        <div className="chat-scroll max-w-3xl mx-auto">
        {messages.map((message: ChatMessage, index: number) => {
            
            if (message.role === ChatRole.STUDENT){
                return (
                    <UserMessage
                        content={message.content}
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
                        key={message.id || index}
                    />
                )
            } else if (message.role === ChatRole.SYSTEM) {
                return (
                    <SystemMessage
                        content={message.content}
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
