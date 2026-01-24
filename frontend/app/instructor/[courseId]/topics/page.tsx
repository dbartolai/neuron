"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { H1, Muted } from "@/components/primitives"
import { useCourseTopics } from "@/hooks/use-course-topics"
import { TopicsList } from "@/components/instructor/topics/topics-list"
import { TopicForm } from "@/components/instructor/topics/topic-form"
import { SyllabusUpload } from "@/components/instructor/topics/syllabus-upload"
import { Plus, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

interface TopicWithCount {
  name: string
  count?: number
}

export default function TopicsPage() {
  const params = useParams()
  const { courseId } = params as { courseId: string }
  
  const {
    topics,
    loading,
    error,
    refetch,
    createTopic,
    updateTopic,
    deleteTopic,
    generateFromSyllabus,
    reclassifyThreads,
  } = useCourseTopics(courseId)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTopic, setEditingTopic] = useState<string | null>(null)
  const [topicStats, setTopicStats] = useState<Record<string, number>>({})
  const [loadingStats, setLoadingStats] = useState(false)
  const [reclassifying, setReclassifying] = useState(false)

  // Fetch topic statistics
  const fetchTopicStats = async () => {
    if (!courseId || topics.length === 0) {
      setTopicStats({})
      return
    }

    setLoadingStats(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(
        `${getApiUrl()}/instructor/courses/${courseId}/insights/tags`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        const stats: Record<string, number> = {}
        data.forEach((stat: { tag: string; count: number }) => {
          stats[stat.tag] = stat.count
        })
        setTopicStats(stats)
      }
    } catch (e) {
      console.error("Failed to fetch topic statistics", e)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchTopicStats()
  }, [topics, courseId])

  const handleCreateTopic = async (name: string) => {
    try {
      await createTopic(name)
      setShowCreateForm(false)
      toast.success("Topic created successfully")
      await fetchTopicStats()
    } catch (e: any) {
      toast.error(e?.message || "Failed to create topic")
      throw e
    }
  }

  const handleUpdateTopic = async (oldName: string, newName: string) => {
    try {
      await updateTopic(oldName, newName)
      setEditingTopic(null)
      toast.success("Topic updated successfully")
      await fetchTopicStats()
    } catch (e: any) {
      toast.error(e?.message || "Failed to update topic")
      throw e
    }
  }

  const handleDeleteTopic = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the topic "${name}"? This will remove the topic from all threads.`)) {
      return
    }
    try {
      await deleteTopic(name)
      toast.success("Topic deleted successfully")
      await fetchTopicStats()
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete topic")
    }
  }

  const handleTopicsGenerated = async (suggestedTopics: string[]) => {
    try {
      // Add each suggested topic
      for (const topic of suggestedTopics) {
        try {
          await createTopic(topic)
        } catch (e: any) {
          // Skip if topic already exists
          if (!e?.message?.includes("already exists")) {
            console.error(`Failed to create topic ${topic}:`, e)
          }
        }
      }
      toast.success(`Added ${suggestedTopics.length} topics`)
      await fetchTopicStats()
    } catch (e: any) {
      toast.error(e?.message || "Failed to add topics")
    }
  }

  const handleReclassify = async () => {
    if (!confirm("This will reclassify all threads in this course. Continue?")) {
      return
    }
    setReclassifying(true)
    try {
      const result = await reclassifyThreads()
      toast.success(
        `Reclassified ${result.classified} threads. ${result.failed > 0 ? `${result.failed} failed.` : ""}`
      )
      await fetchTopicStats()
    } catch (e: any) {
      toast.error(e?.message || "Failed to reclassify threads")
    } finally {
      setReclassifying(false)
    }
  }

  const topicsWithCounts: TopicWithCount[] = topics.map((topic) => ({
    name: topic,
    count: topicStats[topic],
  }))

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <H1 text={"Topics"} />
        <Muted text={"Manage topics for classifying student discussion threads"} />
      </div>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Topic
              </Button>
            )}
            {topics.length > 0 && (
              <Button
                variant="outline"
                onClick={handleReclassify}
                disabled={reclassifying}
              >
                {reclassifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reclassifying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reclassify Threads
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {showCreateForm && (
          <TopicForm
            onSubmit={handleCreateTopic}
            onCancel={() => setShowCreateForm(false)}
            loading={loading}
          />
        )}

        <SyllabusUpload courseId={courseId} onTopicsGenerated={handleTopicsGenerated} />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : (
          <TopicsList
            topics={topicsWithCounts}
            onEdit={(name) => setEditingTopic(name)}
            onDelete={handleDeleteTopic}
          />
        )}

        {editingTopic && (
          <Dialog open={!!editingTopic} onOpenChange={(open) => !open && setEditingTopic(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Topic</DialogTitle>
                <DialogDescription>
                  Renaming a topic will update all threads that use it.
                </DialogDescription>
              </DialogHeader>
              <TopicForm
                initialValue={editingTopic}
                onSubmit={async (newName) => {
                  await handleUpdateTopic(editingTopic, newName)
                }}
                onCancel={() => setEditingTopic(null)}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  )
}
