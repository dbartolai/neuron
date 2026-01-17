"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getAccessToken } from "@/lib/supabase/client"
import { H1, Muted } from "@/components/primitives"
import { getApiUrl } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Student {
  id: string
  name: string
  email: string
  enrolled_at: string
}

export default function StudentDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const studentId = params.studentId as string
  const courseId = searchParams.get("courseId")

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId || !studentId) {
      setError("Course ID and Student ID are required")
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchStudent = async () => {
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
          throw new Error("Failed to fetch student data")
        }

        const students: Student[] = await res.json()
        const foundStudent = students.find((s) => s.id === studentId)
        
        if (!foundStudent) {
          throw new Error("Student not found")
        }

        setStudent(foundStudent)
      } catch (e: any) {
        if (e?.name === "AbortError") return
        setError(e.message || "Failed to load student")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchStudent()

    return () => controller.abort()
  }, [courseId, studentId])

  const handleBack = () => {
    router.push(`/instructor/students?courseId=${courseId}`)
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {loading ? (
              <Skeleton className="h-8 w-48" />
            ) : error ? (
              <H1 text="Error" />
            ) : (
              <>
                <H1 text={student?.name || "Student"} />
                <Muted text={student?.email || ""} />
              </>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 pt-0 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <>
            {/* Most Chatted Topic Section */}
            <Card>
              <CardHeader>
                <CardTitle>Most Chatted Topic</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="write">
                  <TabsList>
                    <TabsTrigger value="write">Write</TabsTrigger>
                    <TabsTrigger value="test">Test</TabsTrigger>
                    <TabsTrigger value="debug">Debug</TabsTrigger>
                  </TabsList>
                  <TabsContent value="write" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Topic insights coming soon
                    </p>
                  </TabsContent>
                  <TabsContent value="test" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Topic insights coming soon
                    </p>
                  </TabsContent>
                  <TabsContent value="debug" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Topic insights coming soon
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Token Usage Section */}
            <Card>
              <CardHeader>
                <CardTitle>Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Input Tokens</p>
                    <p className="text-sm text-muted-foreground">
                      Token usage data coming soon
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Output Tokens</p>
                    <p className="text-sm text-muted-foreground">
                      Token usage data coming soon
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Usage by Model</p>
                    <p className="text-sm text-muted-foreground">
                      Token usage data coming soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
