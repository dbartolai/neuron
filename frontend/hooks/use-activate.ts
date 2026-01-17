"use client"

import { useState, useEffect } from "react"
import { getApiUrl } from "@/lib/utils"

enum TokenStatus {
    ACCEPTED="accepted",
    INVALID="invalid",
    PENDING="pending"
}

interface TokenInfo {
    name: string;
    email: string;
    status: TokenStatus
}

export interface useActivateResponse {
    status: TokenStatus|null;
    name: string;
    setName: (arg: string) => void;
    email: string;
    error: string | null;
    loading: boolean;
}

export function useActivate(token: string|null): useActivateResponse {

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<TokenStatus|null>(null);

    useEffect(() => {

        setError(null);

        if (!token) return;

        const controller = new AbortController();

        (async () => {

            setLoading(true);

            try {

                const res = await fetch (`${getApiUrl()}/invites/info`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        raw_token: token
                    }),
                    signal: controller.signal
                })
                
                if (!res.ok) throw new Error("couldn't find token info")

                const data: TokenInfo = await res.json();
                setName(data.name);
                setEmail(data.email);
                setStatus(data.status);
            } catch (e: any) {
                setError(e.message || "unknown error");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }

        })();

        return () => controller.abort();
    }, [token])

    return {
        status,
        name,
        setName,
        email,
        loading,
        error,
    }
}
