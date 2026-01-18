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
}



export default function MessageLog( {messages, isStreaming = false, streamingContent = ""}: MessageLogProps ) {
    
    // Auto-scroll to bottom when new messages arrive or streaming content updates
    const bottomRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingContent, isStreaming]);

    return (
        <div className="chat-scroll max-w-3xl mx-auto">
        {messages.map((message: ChatMessage, index: number) => {
            
            if (message.role === ChatRole.STUDENT){
                return (
                    <UserMessage
                        content={message.content}
                        key={index}
                    />
                )
            } else if (message.role === ChatRole.ASSISTANT) {
                return (
                    <AssistantMessage
                        content={message.content}
                        key={index}
                    />
                )
            } else if (message.role === ChatRole.SYSTEM) {
                return (
                    <SystemMessage
                        content={message.content}
                        key={index}
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
