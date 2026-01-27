"use client"

import { useState, useEffect } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"



export interface useCourseResponse {
    courseName: string
    courseCode: string
    courseError: string | null
    courseLoading: boolean
    students: Student[]
    files: File[]
    updateCourse: (patch: PatchCourse) => {}
    refetchFiles: () => Promise<void>
}

interface PatchCourse {
    id: string
    name?: string
    code?: string
}

interface Course {
    id: string
    name: string
    code: string
}

interface Student {
    id: string
    name: string
    email: string
    enrolled_at: string
}

export interface File {
    id: string
    course_id: string
    name: string
    supabase_filepath: string
    openai_file_id: string
    size: number
    mime_type: string
}

export function useInstructorCourse(courseId: string): useCourseResponse {

    const [courseName, setCourseName] = useState<string>("");
    const [courseCode, setCourseCode] = useState<string>("");
    const [courseError, setCourseError] = useState<string | null>(null);
    const [courseLoading, setCourseLoading] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [files, setFiles] = useState<File[]>([]);

    const refetchFiles = async () => {
        if (!courseId) return;

        try {
            const token = await getAccessToken();
            const fileRes = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/files`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!fileRes.ok) {
                throw new Error("Failed to fetch files");
            }

            const filedata: File[] = await fileRes.json();
            setFiles(filedata);
        } catch (e: any) {
            console.error("Error refetching files:", e);
            setCourseError(e?.message || "Failed to refetch files");
        }
    };

    const updateCourse = async (patch: PatchCourse) => {

        setCourseLoading(true);

            const controller = new AbortController();

            try {
                const token = await getAccessToken();

                const courseRes = await fetch(`${getApiUrl()}/instructor/courses`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(patch),
                signal: controller.signal,
                });

                if (!courseRes.ok) {
                    const text = await courseRes.text().catch(() => "");
                    throw new Error(text || "Course update failed");
                }

                const data: Course = await courseRes.json();
                setCourseName(data.name);
                setCourseCode(data.code);
            } catch (e: any) {
                if (e?.name === "AbortError") return;
                setCourseError(e?.message || "unknown error");
            } finally {
                if (!controller.signal.aborted) setCourseLoading(false);
            }
    };


    useEffect(() => {

        setCourseError(null);
        setCourseName("");

        if (!courseId) return;

        const controller = new AbortController();

        (async () => {
            setCourseLoading(true);

            try {
                const token = await getAccessToken();
                const courseRes = await fetch (`${getApiUrl()}/courses/${courseId}/policy`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!courseRes.ok) {
                    throw new Error("course name fetch failed");
                }

                const data: Course = await courseRes.json();
                console.log("DATA", data);
                setCourseName(data.name);
                setCourseCode(data.code);
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setCourseError(e.message || "unknown error");
            } finally {
                if (!controller.signal.aborted) setCourseLoading(false);
            }
        })();

        (async () => {
            setCourseLoading(true);
            setStudents([]);

            try {
                const token = await getAccessToken();
                const studentsRes = await fetch (`${getApiUrl()}/instructor/courses/${courseId}/enrollment/preview`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!studentsRes.ok) {
                    throw new Error("course name fetch failed");
                }

                const studata: Student[] = await studentsRes.json();
                console.log("STUDENTS", studata);
                setStudents(studata)
                
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setCourseError(e.message || "unknown error");
            } finally {
                if (!controller.signal.aborted) setCourseLoading(false);
            }
        })();

        (async () => {
            setCourseLoading(true);
            setFiles([]);

            try {
                const token = await getAccessToken();
                const fileRes = await fetch (`${getApiUrl()}/instructor/courses/${courseId}/files`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (!fileRes.ok) {
                    throw new Error("course name fetch failed");
                }

                const filedata: File[] = await fileRes.json();
                setFiles(filedata)
                
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setCourseError(e.message || "unknown error");
            } finally {
                if (!controller.signal.aborted) setCourseLoading(false);
            }
        })();


        
        return () => controller.abort();

    }, [courseId])

    console.log("FILES", files);
    return {
        courseName,
        courseCode,
        courseError,
        courseLoading,
        students,
        files,
        updateCourse,
        refetchFiles
    }
}