"use client"


import { useState, useEffect, useCallback } from 'react'
import {getAccessToken} from "@/lib/supabase/client"

export interface ChatMessage {
    id? : string;
    role : boolean; // True -> user
    content: string;
}

export interface UseChatResponse {
    messages : ChatMessage[];
    sendMessage : (content: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    resetChat: () => void;
}

export function useChat(thread_name : string) : UseChatResponse {

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // reset if thread changes
    useEffect( () => {
        setMessages([]);
        setError(null);
    }, [thread_name]);

    // message send logic
    const sendMessage = useCallback(
        async (content: string) => {
            
            setError(null);

            setMessages((prev) => [
                ...prev,
                {
                    role: true,
                    content
                }
            ]);

            setIsLoading(true);

            try {

                // find supabase access token
                const token = getAccessToken();

                // send request to backend
                const res = await fetch (
                    `http://localhost:8000/chat`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            message: content,
                            thread_name: thread_name
                        }),
                    }
                );

                if (!res.ok){
                    throw new Error(`Backend Error: ${res.status}`);
                }

                const data = await res.json();

                setMessages((prev) => [
                    ...prev,
                    {
                        role: false,
                        content: data.reply
                    }
                ]);
            } catch (err: any) {
                setError(err.message || "unknown error");
            } finally {
                setIsLoading(false);
            }
        }, [thread_name]
    );

    const resetChat = () => {
        setMessages([]);
        setError(null);
    }   

    return {
        messages,
        sendMessage,
        isLoading,
        error,
        resetChat
    };
    
}

