"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"



export interface useCourseResponse {
    courseName: string
    courseError: string | null
    courseLoading: boolean
}


export function useCourse(courseId: string): useCourseResponse {

    const [courseName, setCourseName] = useState<string>("");
    const [courseError, setCourseError] = useState<string | null>(null);
    const [courseLoading, setCourseLoading] = useState(false);

    useEffect(() => {

        setCourseError(null);
        setCourseName("");

        if (!courseId) return;

        const controller = new AbortController();

        (async () => {
            setCourseLoading(true);

            try {
                const token = await getAccessToken();
                const courseRes = await fetch (`http://localhost:8000/courses/${courseId}/name`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!courseRes.ok) {
                    throw new Error("course name fetch failed");
                }

                const data: string = await courseRes.json();
                setCourseName(data);
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setCourseError(e.message || "unknown error");
            } finally {
                if (!controller.signal.aborted) setCourseLoading(false);
            }
        })();
        
        return () => controller.abort();

    }, [courseId])

    return {
        courseName,
        courseError,
        courseLoading
    }
}