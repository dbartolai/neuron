"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import * as React from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { H1, Muted } from "@/components/primitives"
import { useCourseRules } from "@/hooks/use-course-rules"
import { RulesView } from "@/components/instructor/rules/rules-view"
import { RulesEditor } from "@/components/instructor/rules/rules-editor"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInstructorCourse } from "@/hooks/use-instructor-course"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function RulesPage() {
  const params = useParams()
  const { courseId } = params as { courseId: string }
  
  const [activeTab, setActiveTab] = useState<"writing" | "testing" | "debugging">("writing")
  const [editMode, setEditMode] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<number>(0)
  
  const { rules, loading, error, updateRules, resetToDefault } = useCourseRules(courseId, activeTab)
  
  const handleSave = async (updatedRules: any) => {
    try {
      await updateRules(updatedRules)
      setEditMode(false)
    } catch (e) {
      console.error("Failed to save rules:", e)
    }
  }
  
  const handleReset = async () => {
    try {
      await resetToDefault()
      setResetDialogOpen(false)
      setEditMode(false)
    } catch (e) {
      console.error("Failed to reset rules:", e)
    }
  }
  
  // Level defaults fetching is no longer needed since we only have one default per mode
  
  return (
    <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <H1 text={"Rules"} />
        <Muted text={"Configure rules for writing, testing, and debugging modes"} />
        </div>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <div className="flex items-center justify-between">

          <div className="flex gap-2">
            {!editMode && (
              <>
                <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
                  Reset to Default
                </Button>
                <Button onClick={() => setEditMode(true)}>
                  Edit Rules
                </Button>
              </>
            )}
            {editMode && (
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
        
        
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as "writing" | "testing" | "debugging")
          setEditMode(false)
        }}>
          <TabsList>
            <TabsTrigger value="writing">Writing</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="debugging">Debugging</TabsTrigger>
          </TabsList>
          
          <TabsContent value="writing" className="mt-4">
            {loading ? (
              <Muted text="Loading rules..." />
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : editMode ? (
              <RulesEditor rules={rules} onSave={handleSave} loading={loading} />
            ) : (
              <RulesView rules={rules} />
            )}
          </TabsContent>
          
          <TabsContent value="testing" className="mt-4">
            {loading ? (
              <Muted text="Loading rules..." />
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : editMode ? (
              <RulesEditor rules={rules} onSave={handleSave} loading={loading} />
            ) : (
              <RulesView rules={rules} />
            )}
          </TabsContent>
          
          <TabsContent value="debugging" className="mt-4">
            {loading ? (
              <Muted text="Loading rules..." />
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : editMode ? (
              <RulesEditor rules={rules} onSave={handleSave} loading={loading} />
            ) : (
              <RulesView rules={rules} />
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Default</DialogTitle>
            <DialogDescription>
              This will reset the rules for {activeTab} mode to the default configuration. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReset}>
              Reset to Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
