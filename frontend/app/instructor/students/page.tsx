"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getAccessToken } from "@/lib/supabase/client"
import { H1, Muted } from "@/components/primitives"
import { getApiUrl } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface Student {
  id: string
  name: string
  email: string
  enrolled_at: string
}

export default function StudentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseId = searchParams.get("courseId")
  
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) {
      setError("Course ID is required")
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchStudents = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = await getAccessToken()
        const res = await fetch(
          `${getApiUrl()}/instructor/courses/${courseId}/enrollment`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        )

        if (!res.ok) {
          throw new Error("Failed to fetch students")
        }

        const data: Student[] = await res.json()
        setStudents(data)
      } catch (e: any) {
        if (e?.name === "AbortError") return
        setError(e.message || "Failed to load students")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchStudents()

    return () => controller.abort()
  }, [courseId])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const handleRowClick = (studentId: string) => {
    router.push(`/instructor/students/${studentId}?courseId=${courseId}`)
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <H1 text="Students" />
        <Muted text="View and manage all enrolled students" />
      </div>
      <div className="p-4 pt-0">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No students enrolled yet
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow
                    key={student.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(student.id)}
                  >
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email || "—"}</TableCell>
                    <TableCell>{formatDate(student.enrolled_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}
