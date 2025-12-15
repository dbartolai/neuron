"use client"


import { useChat, ChatMessage } from "@/hooks/use-chat"
import UserMessage from "@/components/chat/user-message"

type MessageLogProps = {
    messages: ChatMessage[]
}

export default function MessageLog( {messages}: MessageLogProps ) {



    return (
        <>
        {messages.map((message: ChatMessage, index: number) => {
            if (message.role == false) return null; 
            return (
                <UserMessage
                    content={message.content}
                    key={index}
                />
            )
        })}
        
        </>
        
    )

}