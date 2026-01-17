"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"

export interface CoursePolicy {
    name: string;
    code: string;
    writing_level: number;
    testing_level: number;
    debugging_level: number;
}

export interface useCourseResponse {
    access: boolean;
    courseName: string
    courseError: string | null
    courseLoading: boolean
    policy: CoursePolicy | null
    policyLoading: boolean
}


export function useCourse(courseId: string): useCourseResponse {

    const [access, setAccess] = useState<boolean>(false);
    const [courseName, setCourseName] = useState<string>("");
    const [courseError, setCourseError] = useState<string | null>(null);
    const [courseLoading, setCourseLoading] = useState(false);
    const [policy, setPolicy] = useState<CoursePolicy | null>(null);
    const [policyLoading, setPolicyLoading] = useState(false);

    useEffect(() => {

        setCourseError(null);
        setAccess(false);
        setCourseName("");
        setPolicy(null);

        if (!courseId) return;

        const controller = new AbortController();

        (async () => {
            setCourseLoading(true);
            setPolicyLoading(true);

            try {
                const token = await getAccessToken();
                const accessRes = await fetch (`http://localhost:8000/courses/${courseId}/access`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });
                if (!accessRes.ok) {
                    throw new Error("course access fetch failed");
                }
                const accessData: boolean = await accessRes.json();
                setAccess(accessData);
                // Fetch course name
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

                const nameData: string = await courseRes.json();
                setCourseName(nameData);

                // Fetch course policy
                const policyRes = await fetch(`http://localhost:8000/courses/${courseId}/policy`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!policyRes.ok) {
                    throw new Error("course policy fetch failed");
                }

                const policyData: CoursePolicy = await policyRes.json();
                setPolicy(policyData);
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setCourseError(e.message || "unknown error");
            } finally {
                if (!controller.signal.aborted) {
                    setCourseLoading(false);
                    setPolicyLoading(false);
                }
            }
        })();
        
        return () => controller.abort();

    }, [courseId])

    return {
        access,
        courseName,
        courseError,
        courseLoading,
        policy,
        policyLoading
    }
}