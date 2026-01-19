"use client"

import { useState, useEffect, Suspense } from "react"
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
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Student {
  id: string
  name: string
  email: string
  enrolled_at: string
}

interface TokenUsage {
  model: string
  tokens_in: number
  tokens_out: number
}

interface Thread {
  id: string
  title: string
  updated_at: string
  summary: string
}

function StudentDetailPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const studentId = params.studentId as string
  const courseId = searchParams.get("courseId")

  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [threadsOpen, setThreadsOpen] = useState(false)
  const [insights, setInsights] = useState<string | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [canRefreshInsights, setCanRefreshInsights] = useState(false)

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

  useEffect(() => {
    if (!courseId || !studentId) return

    const controller = new AbortController()

    const fetchTokenUsage = async () => {
      setLoadingUsage(true)
      try {
        const token = await getAccessToken()
        const res = await fetch(
          `${getApiUrl()}/instructor/courses/${courseId}/students/${studentId}/usage`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        )

        if (!res.ok) {
          throw new Error("Failed to fetch token usage")
        }

        const data: TokenUsage[] = await res.json()
        setTokenUsage(data)
      } catch (e: any) {
        if (e?.name === "AbortError") return
        console.error("Failed to load token usage:", e)
      } finally {
        if (!controller.signal.aborted) {
          setLoadingUsage(false)
        }
      }
    }

    fetchTokenUsage()

    return () => controller.abort()
  }, [courseId, studentId])

  useEffect(() => {
    if (!courseId || !studentId) return

    const controller = new AbortController()

    const fetchThreads = async () => {
      setLoadingThreads(true)
      try {
        const token = await getAccessToken()
        const res = await fetch(
          `${getApiUrl()}/instructor/courses/${courseId}/students/${studentId}/threads`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        )

        if (!res.ok) {
          throw new Error("Failed to fetch threads")
        }

        const data: Thread[] = await res.json()
        setThreads(data)
      } catch (e: any) {
        if (e?.name === "AbortError") return
        console.error("Failed to load threads:", e)
      } finally {
        if (!controller.signal.aborted) {
          setLoadingThreads(false)
        }
      }
    }

    fetchThreads()

    return () => controller.abort()
  }, [courseId, studentId])

  useEffect(() => {
    if (!courseId || !studentId) return

    const controller = new AbortController()

    const fetchInsights = async () => {
      setLoadingInsights(true)
      try {
        const token = await getAccessToken()
        const res = await fetch(
          `${getApiUrl()}/instructor/courses/${courseId}/students/${studentId}/insights`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        )

        if (!res.ok) {
          throw new Error("Failed to fetch insights")
        }

        const data: { insights: { summary: string; renewable_at: string | null } | null; can_refresh: boolean } = await res.json()
        if (data.insights) {
          setInsights(data.insights.summary)
          setCanRefreshInsights(data.can_refresh)
        } else {
          setInsights(null)
          setCanRefreshInsights(false)
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return
        console.error("Failed to load insights:", e)
      } finally {
        if (!controller.signal.aborted) {
          setLoadingInsights(false)
        }
      }
    }

    fetchInsights()

    return () => controller.abort()
  }, [courseId, studentId])

  const handleGenerateInsights = async () => {
    if (!courseId || !studentId) return

    setGeneratingInsights(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(
        `${getApiUrl()}/instructor/courses/${courseId}/students/${studentId}/insights/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to generate insights" }))
        throw new Error(errorData.detail || "Failed to generate insights")
      }

      const data: { insights: { summary: string; renewable_at: string | null }; can_refresh: boolean } = await res.json()
      setInsights(data.insights.summary)
      setCanRefreshInsights(data.can_refresh)
    } catch (e: any) {
      console.error("Failed to generate insights:", e)
      alert(e.message || "Failed to generate insights")
    } finally {
      setGeneratingInsights(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleThreadClick = (threadId: string) => {
    if (courseId) {
      router.push(`/instructor/students/${studentId}/${threadId}?courseId=${courseId}`)
    } else {
      router.push(`/instructor/students/${studentId}/${threadId}`)
    }
  }

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
            {/* Cards side by side */}
            <div className="grid grid-cols-3 gap-4">
              {/* Token Usage Card - 1/3 width */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Token Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingUsage ? (
                    <Skeleton className="h-32 w-full" />
                  ) : tokenUsage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No token usage data available
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead className="text-right">Tokens In</TableHead>
                          <TableHead className="text-right">Tokens Out</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tokenUsage.map((usage) => (
                          <TableRow key={usage.model}>
                            <TableCell className="font-medium">
                              {usage.model}
                            </TableCell>
                            <TableCell className="text-right">
                              {usage.tokens_in.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {usage.tokens_out.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Topic Insights Card - 2/3 width */}
              <Card className="col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Insights</CardTitle>
                  {insights && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateInsights}
                            disabled={!canRefreshInsights || generatingInsights}
                          >
                            {generatingInsights ? "Generating..." : "Refresh Insights"}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canRefreshInsights && (
                        <TooltipContent>
                          <p>Insights can be refreshed once every 7 days</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </CardHeader>
                <CardContent>
                  {loadingInsights ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : insights ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {insights}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">
                        No insights generated yet. Generate insights to analyze this student's learning patterns.
                      </p>
                      <Button
                        onClick={handleGenerateInsights}
                        disabled={generatingInsights}
                      >
                        {generatingInsights ? "Generating..." : "Generate Insights"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Threads Table - Collapsible */}
            <Collapsible open={threadsOpen} onOpenChange={setThreadsOpen}>
            
              <Card className="px-2 py-2">
              <CollapsibleTrigger asChild={true}>
                  <CardHeader className="px-4 py-4 flex align-middle cursor-pointer hover:bg-accent/50 transition-colors rounded-lg">
                    
                    <div className="flex items-center justify-between w-full mb-0">
                      <CardTitle>Student Threads</CardTitle>
                      {threadsOpen ? (
                         <ChevronUp className="h-4 w-4 " />
                       
                      ) : (
                         <ChevronDown className="h-4 w-4 hover:accent-foreground" />
                      )}

                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {loadingThreads ? (
                      <Skeleton className="h-32 w-full" />
                    ) : threads.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No threads found
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Thread Name</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Summary</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {threads.map((thread) => (
                            <TableRow
                              key={thread.id}
                              className="cursor-pointer"
                              onClick={() => handleThreadClick(thread.id)}
                            >
                              <TableCell className="font-medium">
                                {thread.title}
                              </TableCell>
                              <TableCell>
                                {formatDate(thread.updated_at)}
                              </TableCell>
                              <TableCell className="max-w-md">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                                      {thread.summary}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-md">
                                    <p className="text-sm whitespace-pre-wrap">
                                      {thread.summary}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}
      </div>
    </>
  )
}

function LoadingFallback() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </div>
      <div className="p-4 pt-0 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </>
  )
}

export default function StudentDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StudentDetailPageContent />
    </Suspense>
  )
}
