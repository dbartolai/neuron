"use client"

import { useState, useEffect } from "react"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useParams } from "next/navigation"
import { H1, Muted } from "@/components/primitives"
import { useInstructorCourse } from "@/hooks/use-instructor-course"
import { useInsights } from "@/hooks/use-insights"
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function InsightsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { courseName, courseCode } = useInstructorCourse(courseId);
  const { status, tagStatistics, loading, unlockInsights, updateTags, refresh } = useInsights(courseId || "");
  
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showReclassifyDialog, setShowReclassifyDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [sortColumn, setSortColumn] = useState<"tag" | "threads" | "percentage" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Initialize editing tags from status
  useEffect(() => {
    if (status?.thread_tags) {
      if (editingTags.length === 0) {
        // Initial load
        setEditingTags([...status.thread_tags]);
        setHasChanges(false);
      } else if (!hasChanges) {
        // Sync if no local changes (tags updated externally after save)
        const currentTagsStr = JSON.stringify(editingTags);
        const statusTagsStr = JSON.stringify(status.thread_tags);
        if (currentTagsStr !== statusTagsStr) {
          setEditingTags([...status.thread_tags]);
        }
      }
    }
  }, [status?.thread_tags, hasChanges]);

  const handleUnlock = async () => {
    await unlockInsights();
    await refresh();
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...editingTags];
    newTags[index] = value;
    setEditingTags(newTags);
    
    // Check if tags have changed
    const hasChanged = JSON.stringify(newTags) !== JSON.stringify(status?.thread_tags || []);
    setHasChanges(hasChanged);
  };

  const handleSave = async () => {
    // Validate we have exactly 10 non-empty tags
    const validTags = editingTags.filter(tag => tag.trim() !== "");
    if (validTags.length !== 10) {
      alert("You must have exactly 10 tags. Please fill in all tag fields.");
      return;
    }

    // Check for duplicate tags
    const uniqueTags = new Set(validTags.map(t => t.toLowerCase()));
    if (uniqueTags.size !== 10) {
      alert("All tags must be unique.");
      return;
    }

    setSaving(true);
    try {
      // Save tags without reclassifying
      await updateTags(validTags, false);
      await refresh();
      setHasChanges(false);
      // Show dialog asking if they want to reclassify
      setShowReclassifyDialog(true);
    } catch (e: any) {
      console.error("Failed to save tags", e);
      alert("Failed to save tags: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleReclassify = async () => {
    setReclassifying(true);
    setShowReclassifyDialog(false);
    try {
      // Update tags with reclassify=true (tags are already saved, but we need to trigger reclassification)
      const validTags = editingTags.filter(tag => tag.trim() !== "");
      await updateTags(validTags, true);
      await refresh();
      setHasChanges(false);
    } catch (e: any) {
      console.error("Failed to reclassify threads", e);
      alert("Failed to reclassify threads: " + (e.message || "Unknown error"));
    } finally {
      setReclassifying(false);
    }
  };

  const handleCancel = () => {
    // Reset to original tags
    if (status?.thread_tags) {
      setEditingTags([...status.thread_tags]);
      setHasChanges(false);
    }
  };

  const handleSort = (column: "tag" | "threads" | "percentage") => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: "tag" | "threads" | "percentage") => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  if (!status) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <Muted text="Loading insights..." />
        </div>
      </>
    );
  }

  if (status.total_threads < 20) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
          <H1 text={courseName} />
          <Muted text={courseCode} />
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <Muted text="You can see insights once students start to use Neuron" />
          <Muted text={`Current threads: ${status.total_threads}/20`} />
        </div>
      </>
    );
  }

  if (!status.is_unlocked) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
          <H1 text={courseName} />
          <Muted text={courseCode} />
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          {loading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <Muted text="Generating insights..." />
            </>
          ) : (
            <>
              <Muted text="Unlock insights to see what students are discussing" />
              <Button 
                className="mt-4" 
                onClick={handleUnlock}
                disabled={loading}
              >
                Unlock Insights
              </Button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <H1 text={courseName} />
        <Muted text={courseCode} />
      </div>
      <div className="flex flex-col gap-6 p-4 w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Insights</h1>
          {hasChanges && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {reclassifying && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <Muted text="Reclassifying threads with new tags..." />
          </div>
        )}

        {(() => {
          // Create combined data structure for sorting (inside IIFE so status is guaranteed non-null)
          type TableRowData = {
            originalIndex: number;
            tag: string;
            count: number;
            percentage: number;
          };

          const tableData: TableRowData[] = (status.thread_tags || []).map((tag, index) => {
            const stat = tagStatistics.find(s => s.tag === tag);
            const displayTag = editingTags[index] || tag;
            return {
              originalIndex: index,
              tag: displayTag,
              count: stat?.count ?? 0,
              percentage: stat?.percentage ?? 0,
            };
          });

          // Sort the data
          const sortedData: TableRowData[] = [...tableData].sort((a, b) => {
            if (!sortColumn) return 0;

            let comparison = 0;
            switch (sortColumn) {
              case "tag":
                comparison = a.tag.localeCompare(b.tag);
                break;
              case "threads":
                comparison = a.count - b.count;
                break;
              case "percentage":
                comparison = a.percentage - b.percentage;
                break;
            }

            return sortDirection === "asc" ? comparison : -comparison;
          });

          return (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("tag")}
                    >
                      <div className="flex items-center">
                        Tag
                        {getSortIcon("tag")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("threads")}
                    >
                      <div className="flex items-center">
                        Threads
                        {getSortIcon("threads")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort("percentage")}
                    >
                      <div className="flex items-center justify-end">
                        Percentage
                        {getSortIcon("percentage")}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row) => {
                    const originalIndex = row.originalIndex;
                    
                    return (
                      <TableRow key={originalIndex}>
                        <TableCell>
                          <Input
                            value={row.tag}
                            onChange={(e) => handleTagChange(originalIndex, e.target.value)}
                            className="font-medium"
                            placeholder={`Tag ${originalIndex + 1}`}
                          />
                        </TableCell>
                        <TableCell>{row.count}</TableCell>
                        <TableCell className="text-right">{row.percentage.toFixed(2)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })()}
      </div>

      <Dialog open={showReclassifyDialog} onOpenChange={setShowReclassifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reclassify Threads?</DialogTitle>
            <DialogDescription>
              Would you like to automatically reclassify all threads using the new tags? 
              This will analyze each thread and assign it to the most appropriate tag.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReclassifyDialog(false)}>
              Skip
            </Button>
            <Button onClick={handleReclassify} disabled={reclassifying}>
              {reclassifying ? "Reclassifying..." : "Yes, Reclassify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
