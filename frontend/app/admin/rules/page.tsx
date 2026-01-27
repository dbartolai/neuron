"use client"

import { useState } from "react"
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
import { useAdminRules } from "@/hooks/use-admin-rules"
import { RulesView } from "@/components/instructor/rules/rules-view"
import { RulesEditor } from "@/components/instructor/rules/rules-editor"
import { Button } from "@/components/ui/button"

export default function AdminRulesPage() {
  const [activeTab, setActiveTab] = useState<"writing" | "testing" | "debugging">("writing")
  const [editMode, setEditMode] = useState(false)
  
  const { rules, loading, error, refetch, updateRules } = useAdminRules(activeTab)
  
  const handleSave = async (updatedRules: any) => {
    try {
      await updateRules(updatedRules)
      setEditMode(false)
      refetch()
    } catch (e) {
      console.error("Failed to save rules:", e)
    }
  }
  
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 max-w-4xl min-w-4xl mx-auto pt-0 mb-8 overflow-x-hidden">
        <H1 text="Default Rules Management" />
        <Muted text="Configure default rules for writing, testing, and debugging modes" />
        
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as "writing" | "testing" | "debugging")
          setEditMode(false)
        }}>
          <TabsList>
            <TabsTrigger value="writing">Writing</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="debugging">Debugging</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Default Rules for {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Mode
                </span>
              </div>
              <div className="flex gap-2">
                {!editMode && (
                  <Button onClick={() => setEditMode(true)}>
                    Edit Rules
                  </Button>
                )}
                {editMode && (
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
            
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
    </>
  )
}
