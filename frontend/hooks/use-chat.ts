"use client"


import { useState, useEffect, useCallback, useRef } from 'react'
import {getAccessToken} from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

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
    useFallback: (originalMessage: string, systemMessageId: string) => Promise<void>;
    getViolationMetadata: (messageId?: string) => {hasFallback: boolean, originalMessage: string} | null;
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
    
    // Track violation metadata for system messages (keyed by system message ID)
    const violationMetadataRef = useRef<Map<string, {hasFallback: boolean, originalMessage: string}>>(new Map());

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
                const name_res = await fetch(`${getApiUrl()}/chat/${thread_id}/name`,{
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

                const res = await fetch(`${getApiUrl()}/chat/${thread_id}`, {
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
                    `${getApiUrl()}/chat/stream`,
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
                        if (event.event === 'violation') {
                            try {
                                const data = JSON.parse(event.data);
                                // Store violation metadata for later use
                                if (data.has_fallback && data.system_message_id && data.original_message) {
                                    violationMetadataRef.current.set(data.system_message_id, {
                                        hasFallback: data.has_fallback,
                                        originalMessage: data.original_message
                                    });
                                }
                                // Mark as error response (rule violation) so we know to split tokens
                                isErrorResponseRef.current = true;
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
                        } else if (event.event === 'token') {
                            try {
                                const data = JSON.parse(event.data);
                                // If this is a violation response, split the token content into words for smooth streaming
                                if (isErrorResponseRef.current && data.content) {
                                    // Split large token content into words for smooth animation
                                    const words = data.content.split(' ');
                                    for (let i = 0; i < words.length; i++) {
                                        tokenQueueRef.current.push(words[i] + (i < words.length - 1 ? ' ' : ''));
                                    }
                                } else {
                                    // Normal token streaming
                                    tokenQueueRef.current.push(data.content);
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
                    // If this is a system message from a violation, try to find its ID from violation metadata
                    let systemMessageId: string | undefined = undefined;
                    if (isErrorResponseRef.current) {
                        // Find the most recent violation metadata entry
                        const violationEntries = Array.from(violationMetadataRef.current.entries());
                        if (violationEntries.length > 0) {
                            // Use the most recent one (last entry)
                            systemMessageId = violationEntries[violationEntries.length - 1][0];
                        }
                    }
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: systemMessageId,
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
        violationMetadataRef.current.clear();
    }, [stopDraining])
    
    const useFallback = useCallback(async (originalMessage: string, systemMessageId: string) => {
        if (!thread_id) return;
        
        setIsStreaming(true);
        setStreamingContent("");
        setError(null);
        
        // Reset token queue for new stream
        tokenQueueRef.current = [];
        fullContentRef.current = "";
        isErrorResponseRef.current = false;
        startDraining();
        
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        try {
            const token = await getAccessToken();
            
            const res = await fetch(`${getApiUrl()}/chat/fallback`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    thread_id: thread_id,
                    original_message: originalMessage,
                    system_message_id: systemMessageId
                }),
                signal: controller.signal,
            });
            
            if (!res.ok) {
                throw new Error(`Fallback request failed: ${res.status}`);
            }
            
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
                            tokenQueueRef.current.push(data.content);
                        } catch (e) {
                            // Ignore parse errors
                        }
                    } else if (event.event === 'error') {
                        try {
                            const data = JSON.parse(event.data);
                            isErrorResponseRef.current = true;
                            const words = data.message.split(' ');
                            for (let i = 0; i < words.length; i++) {
                                tokenQueueRef.current.push(words[i] + (i < words.length - 1 ? ' ' : ''));
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                    } else if (event.event === 'done') {
                        break;
                    }
                }
                
                // Clear processed events from buffer
                const lastDoubleNewline = buffer.lastIndexOf('\n\n');
                if (lastDoubleNewline !== -1) {
                    buffer = buffer.slice(lastDoubleNewline + 2);
                }
            }
            
            // Wait for queue to fully drain
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
            
            // Move streaming content to messages as assistant message
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
    }, [thread_id, startDraining, stopDraining]);
    
    const getViolationMetadata = useCallback((messageId?: string): {hasFallback: boolean, originalMessage: string} | null => {
        if (!messageId) return null;
        return violationMetadataRef.current.get(messageId) || null;
    }, []);

    return {
        threadName,
        messages,
        sendMessage,
        nameLoading,
        chatLoading,
        isStreaming,
        streamingContent,
        error,
        resetChat,
        useFallback,
        getViolationMetadata
    };
    
}
