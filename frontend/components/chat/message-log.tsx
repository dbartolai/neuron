"use client"


import { useChat, ChatMessage } from "@/hooks/use-chat"
import {ChatRole} from "@/hooks/use-chat"
import UserMessage from "@/components/chat/user-message"
import AssistantMessage from "./assistant-message"

type MessageLogProps = {
    messages: ChatMessage[]
}



export default function MessageLog( {messages}: MessageLogProps ) {

    return (
        <>
        {messages.map((message: ChatMessage, index: number) => {
            
            if (message.role === ChatRole.STUDENT){
                {console.log("user")}
                {console.log(message.content)}
                return (
                    <UserMessage
                        content={message.content}
                        key={index}
                    />
                )
            } else if (message.role === ChatRole.ASSISTANT) {
                {console.log("ceria")}
                {console.log(message.content)}
                return (
                    <AssistantMessage
                        content={message.content}
                        key={index}
                    />
                )
            }
        })} 
        
        </>
        
    )

}