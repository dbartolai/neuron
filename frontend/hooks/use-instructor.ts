"use client"

import * as React from "react"
import { getAccessToken, supabase } from "@/lib/supabase/client"
import { LucideIcon, SquareTerminal } from "lucide-react"




type InstructorCourse = {
    id: string;
    title: string;
    url: string;
    icon: LucideIcon;
}

type NavUser = {
    name: string;
    email?: string;
    avatar: string;
}

type Sidebar = {
    courses: InstructorCourse[];
    user?: NavUser;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

type GetThreadResponse = {
    id: string;
    updated_at: string;
    title: string;
}

type SidebarCourse = {
    id: string;
    name: string;
    thread_count: number;
    thread_preview: GetThreadResponse[];
}


const DEFAULT_COURSE_ICON = SquareTerminal;

function mapSidebar(courses: SidebarCourse[]): InstructorCourse[] {

    return courses.map((c) => {
        const courseUrl = `/chat/${c.id}`;
        const items = [
            {title: "+ New Thread", url: courseUrl},
            ...c.thread_preview.map((t) => ({
                title: t.title, 
                url: `/chat/${c.id}/${t.id}`
            })),
        ];

        return {
            id: c.id,
            title: c.name,
            url: courseUrl,
            icon: DEFAULT_COURSE_ICON,
            items, 
            meta: {threadCount: c.thread_count}
        };
    });
}


export function useInstructor() : Sidebar {

    const [courses, setCourses] = React.useState<InstructorCourse[]>([]);
    const [user, setUser] = React.useState<NavUser>();
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const refetch = React.useCallback(async () => {

        const controller = new AbortController();

        setError(null);
        setIsLoading(true);

        try {
            
            const token = await getAccessToken();

            const res = await fetch ("http://localhost:8000/instructor/courses", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                signal: controller.signal,
            });

            if (!res.ok) throw new Error(`couldn't load sidebar: ${res.status}`)

            const sidebar_data: SidebarCourse[] = await res.json();
            setCourses(mapSidebar(sidebar_data));

            // find user data
            const { data: {user}} = await supabase.auth.getUser();
            const name_res = await fetch ("http://localhost:8000/users/name", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                },
            });

            const name = await name_res.json();
            setUser({
                name: name,
                email: user?.email,
                avatar: ""
            })

        } catch (e: any) {
            if (e?.name === "AbortError") return;
            setError(e?.message || "couldn't load sidebar");
        } finally {
            setIsLoading(false);
        }


    }, []);

    // initially load sidebar
    React.useEffect(() => {
        void refetch();
    }, [refetch]);

    return {courses, user, isLoading, error, refetch};
}