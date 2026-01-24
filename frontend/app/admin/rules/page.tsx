"use client"

import { useState, useEffect } from "react"
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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function AdminRulesPage() {
  const [activeTab, setActiveTab] = useState<"writing" | "testing" | "debugging">("writing")
  const [selectedLevel, setSelectedLevel] = useState<number | undefined>(undefined)
  const [editMode, setEditMode] = useState(false)
  
  const { rules, defaults, loading, error, refetch, updateRules } = useAdminRules(
    activeTab,
    selectedLevel
  )
  
  // Get available levels based on thread type
  const getMaxLevel = () => {
    return activeTab === "writing" ? 7 : 5
  }
  
  const availableLevels = Array.from({ length: getMaxLevel() + 1 }, (_, i) => i)
  
  const handleSave = async (updatedRules: any) => {
    try {
      await updateRules(updatedRules)
      setEditMode(false)
      refetch()
    } catch (e) {
      console.error("Failed to save rules:", e)
    }
  }
  
  const handleLevelSelect = (level: string) => {
    setSelectedLevel(Number(level))
    setEditMode(false)
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
        <Muted text="Configure default rules for writing, testing, and debugging levels" />
        
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as "writing" | "testing" | "debugging")
          setSelectedLevel(undefined)
          setEditMode(false)
        }}>
          <TabsList>
            <TabsTrigger value="writing">Writing</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="debugging">Debugging</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Level</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedLevel !== undefined ? String(selectedLevel) : ""}
                  onValueChange={handleLevelSelect}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLevels.map((level) => (
                      <SelectItem key={level} value={String(level)}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            
            {selectedLevel !== undefined && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Editing: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Level {selectedLevel}
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
              </>
            )}
            
            {selectedLevel === undefined && (
              <Card>
                <CardHeader>
                  <CardTitle>All Default Rules for {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</CardTitle>
                </CardHeader>
                <CardContent>
                  {defaults.length === 0 ? (
                    <Muted text="No default rules configured yet" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Level</TableHead>
                          <TableHead>Rules ID</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {defaults.map((defaultRule) => (
                          <TableRow key={defaultRule.level_idx}>
                            <TableCell>{defaultRule.level_idx}</TableCell>
                            <TableCell className="font-mono text-xs">{defaultRule.id}</TableCell>
                            <TableCell>{defaultRule.version_num || 1}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedLevel(defaultRule.level_idx)
                                  setEditMode(false)
                                }}
                              >
                                View/Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
