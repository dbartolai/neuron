"use client"


import { useState, useEffect, useCallback, useRef } from 'react'
import {getAccessToken} from "@/lib/supabase/client"

export const enum ChatRole  {
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
    isStreaming: boolean;
    streamingContent: string;
    error: string | null;
    resetChat: () => void;
}

// Helper function to parse SSE events from a chunk of text
function parseSSEEvents(chunk: string): Array<{event: string, data: string}> {
    const events: Array<{event: string, data: string}> = [];
    const lines = chunk.split('\n');
    
    let currentEvent = '';
    let currentData = '';
    
    for (const line of lines) {
        if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
        } else if (line === '' && currentEvent && currentData) {
            events.push({ event: currentEvent, data: currentData });
            currentEvent = '';
            currentData = '';
        }
    }
    
    return events;
}

export function useChat(thread_id : string) : UseChatResponse {

    const [threadName, setThreadName] = useState<string>("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [nameLoading, setNameLoading] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    
    // Ref to track abort controller for streaming
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // Token queue for smooth rendering (ChatGPT-like effect)
    const tokenQueueRef = useRef<string[]>([]);
    const drainIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fullContentRef = useRef<string>("");
    
    // Track if the current response is an error (rule violation)
    const isErrorResponseRef = useRef<boolean>(false);

    // Start draining the token queue at a fixed interval
    const startDraining = useCallback(() => {
        if (drainIntervalRef.current) return; // Already draining
        
        drainIntervalRef.current = setInterval(() => {
            if (tokenQueueRef.current.length > 0) {
                const token = tokenQueueRef.current.shift()!;
                fullContentRef.current += token;
                setStreamingContent(fullContentRef.current);
            }
        }, 20); // 20ms = ~50 tokens/second, feels natural
    }, []);

    // Stop draining the token queue
    const stopDraining = useCallback(() => {
        if (drainIntervalRef.current) {
            clearInterval(drainIntervalRef.current);
            drainIntervalRef.current = null;
        }
    }, []);

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
        // Clean up any ongoing streaming when thread changes
        stopDraining();
        tokenQueueRef.current = [];
        fullContentRef.current = "";
        
        setMessages([]);
        setStreamingContent("");
        setIsStreaming(false);

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

    }, [thread_id, stopDraining]);

    // message send logic with streaming
    const sendMessage = useCallback(
        async (content: string) => {
            
            setError(null);

            // Add user message to the list immediately
            setMessages((prev) => [
                ...prev,
                {
                    role: ChatRole.STUDENT,
                    content
                }
            ]);

            setIsStreaming(true);
            setStreamingContent("");
            
            // Reset token queue for new stream
            tokenQueueRef.current = [];
            fullContentRef.current = "";
            isErrorResponseRef.current = false;
            startDraining();

            // Create abort controller for this request
            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                // find supabase access token
                const token = await getAccessToken();

                // send request to streaming endpoint
                const res = await fetch(
                    `http://localhost:8000/chat/stream`,
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
                        signal: controller.signal,
                    }
                );

                if (!res.ok){
                    throw new Error(`Backend Error: ${res.status}`);
                }

                // Read the stream
                const reader = res.body?.getReader();
                if (!reader) {
                    throw new Error("No response body");
                }

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    
                    // Parse SSE events from the buffer
                    const events = parseSSEEvents(buffer);
                    
                    for (const event of events) {
                        if (event.event === 'token') {
                            try {
                                const data = JSON.parse(event.data);
                                // Push token to queue instead of updating state directly
                                tokenQueueRef.current.push(data.content);
                            } catch (e) {
                                // Ignore parse errors
                            }
                        } else if (event.event === 'error') {
                            try {
                                const data = JSON.parse(event.data);
                                // Mark as error response (rule violation)
                                isErrorResponseRef.current = true;
                                // Split error message into words for smooth animation
                                const words = data.message.split(' ');
                                for (let i = 0; i < words.length; i++) {
                                    tokenQueueRef.current.push(words[i] + (i < words.length - 1 ? ' ' : ''));
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        } else if (event.event === 'done') {
                            // Streaming complete
                            break;
                        }
                    }
                    
                    // Clear processed events from buffer
                    // Keep only the incomplete part (after last double newline)
                    const lastDoubleNewline = buffer.lastIndexOf('\n\n');
                    if (lastDoubleNewline !== -1) {
                        buffer = buffer.slice(lastDoubleNewline + 2);
                    }
                }

                // Wait for queue to fully drain before moving to messages
                const waitForDrain = () => {
                    return new Promise<void>((resolve) => {
                        const check = setInterval(() => {
                            if (tokenQueueRef.current.length === 0) {
                                clearInterval(check);
                                resolve();
                            }
                        }, 50);
                    });
                };

                await waitForDrain();
                stopDraining();

                // Move streaming content to messages
                // Use SYSTEM role for error responses (rule violations)
                if (fullContentRef.current) {
                    const messageRole = isErrorResponseRef.current ? ChatRole.SYSTEM : ChatRole.ASSISTANT;
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: messageRole,
                            content: fullContentRef.current
                        }
                    ]);
                }
                
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    // Clean up on abort
                    stopDraining();
                    tokenQueueRef.current = [];
                    fullContentRef.current = "";
                    return;
                }
                setError(err.message || "unknown error");
            } finally {
                setIsStreaming(false);
                setStreamingContent("");
                abortControllerRef.current = null;
            }
        }, [thread_id, startDraining, stopDraining]
    );

    const resetChat = useCallback(() => {
        // Abort any ongoing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // Stop draining and clear the token queue
        stopDraining();
        tokenQueueRef.current = [];
        fullContentRef.current = "";
        setMessages([]);
        setStreamingContent("");
        setIsStreaming(false);
        setError(null);
    }, [stopDraining])   

    return {
        threadName,
        messages,
        sendMessage,
        nameLoading,
        chatLoading,
        isStreaming,
        streamingContent,
        error,
        resetChat
    };
    
}
