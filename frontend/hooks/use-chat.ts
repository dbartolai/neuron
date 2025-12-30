"use client"


import { useState, useEffect, useCallback } from 'react'
import {getAccessToken} from "@/lib/supabase/client"

enum ChatRole  {
    STUDENT = "student",
    INSTRUCTOR = "instructor",
    ASSISTANT = "assistant",
    SYSTEM = "system"
};

export interface ChatMessage {
    id? : string;
    role : ChatRole;
    content: string;
}

export interface UseChatResponse {
    threadName : string;
    messages : ChatMessage[];
    sendMessage : (content: string) => Promise<void>;
    nameLoading: boolean;
    chatLoading: boolean;
    error: string | null;
    resetChat: () => void;
}

export function useChat(thread_id : string) : UseChatResponse {

    const [threadName, setThreadName] = useState<string>("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [nameLoading, setNameLoading] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // reset if thread changes
    useEffect(() => {
        setError(null);
        setThreadName("");

        if (!thread_id) return;
        const controller = new AbortController();

        (async () => {

            setNameLoading(true);

            try {
                const token = await getAccessToken();
                const name_res = await fetch(`http://localhost:8000/chat/${thread_id}/name`,{
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!name_res.ok) {
                    throw new Error ("name fetch failed");
                }

                const data: string = await name_res.json();

                setThreadName(data)
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setError(e.message || "Unknown Error");
            } finally {
                 if (!controller.signal.aborted) setNameLoading(false);
            }
        })();

        return () => controller.abort();

    }, [thread_id]);

    // get message history in thread
    useEffect( () => {

        setMessages([]);


        if (!thread_id) return;

        const controller = new AbortController();

        (async () => {

            setError(null);
            setChatLoading(true);

            try {

                // get access token
                const token = await getAccessToken();

                const res = await fetch(`http://localhost:8000/chat/${thread_id}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!res.ok){
                    throw new Error("message fetch failed");
                }

                const data = (await res.json()) as ChatMessage[];

                setMessages(
                    data.map((m) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                    }))
                );
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setError( e || "unknown error");
            } finally {
                if (!controller.signal.aborted) setChatLoading(false);
            }

            

        })();

        return () => controller.abort();

    }, [thread_id]);

    // message send logic
    const sendMessage = useCallback(
        async (content: string) => {
            
            setError(null);

            setMessages((prev) => [
                ...prev,
                {
                    role: ChatRole.STUDENT,
                    content
                }
            ]);

            setChatLoading(true);

            try {

                // find supabase access token
                const token = await getAccessToken();

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
                            thread_id: thread_id
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
                        role: ChatRole.ASSISTANT,
                        content: data.reply
                    }
                ]);
            } catch (err: any) {
                setError(err.message || "unknown error");
            } finally {
                setChatLoading(false);
            }
        }, [thread_id]
    );

    const resetChat = () => {
        setMessages([]);
        setError(null);
    }   

    return {
        threadName,
        messages,
        sendMessage,
        nameLoading,
        chatLoading,
        error,
        resetChat
    };
    
}

