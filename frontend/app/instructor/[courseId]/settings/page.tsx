"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { H1, Muted } from "@/components/primitives"
import { useInstructorCourse } from "@/hooks/use-instructor-course"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldTitle,
} from "@/components/ui/field"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

export default function SettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { courseId } = params as { courseId: string }
  
  const { courseName, courseCode, courseLoading, updateCourse } = useInstructorCourse(courseId)
  
  const [requireApproval, setRequireApproval] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [codeDialogOpen, setCodeDialogOpen] = useState(false)
  const [nameValue, setNameValue] = useState(courseName)
  const [codeValue, setCodeValue] = useState(courseCode)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isSavingCode, setIsSavingCode] = useState(false)

  // Update local state when course data loads
  useEffect(() => {
    if (courseName) setNameValue(courseName)
    if (courseCode) setCodeValue(courseCode)
  }, [courseName, courseCode])

  // Reset dialog values when opening
  useEffect(() => {
    if (nameDialogOpen) {
      setNameValue(courseName)
    }
  }, [nameDialogOpen, courseName])

  useEffect(() => {
    if (codeDialogOpen) {
      setCodeValue(courseCode)
    }
  }, [codeDialogOpen, courseCode])

  const handleSaveName = async () => {
    if (nameValue === courseName || !nameValue.trim()) {
      setNameDialogOpen(false)
      return
    }
    
    setIsSavingName(true)
    try {
      await updateCourse({ id: courseId, name: nameValue.trim() })
      setNameDialogOpen(false)
    } catch (e) {
      console.error("Failed to save course name:", e)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleSaveCode = async () => {
    if (codeValue === courseCode || !codeValue.trim()) {
      setCodeDialogOpen(false)
      return
    }
    
    setIsSavingCode(true)
    try {
      await updateCourse({ id: courseId, code: codeValue.trim() })
      setCodeDialogOpen(false)
    } catch (e) {
      console.error("Failed to save course code:", e)
    } finally {
      setIsSavingCode(false)
    }
  }

  const handleDeleteCourse = async () => {
    setIsDeleting(true)
    try {
      const token = await getAccessToken()
      const response = await fetch(`${getApiUrl()}/instructor/courses/${courseId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(text || "Failed to delete course")
      }

      // Redirect to instructor dashboard
      router.push("/instructor")
    } catch (e: any) {
      console.error("Failed to delete course:", e)
      alert(e?.message || "Failed to delete course")
      setIsDeleting(false)
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
        </div>
      </header>
      <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
        <H1 text="Settings" />
        <Muted text="Manage course settings and preferences" />
      </div>
      
      <div className="flex justify-center px-4">
        <div className="w-full max-w-3xl">
          <div className="flex flex-col gap-8">
            
            {/* Course Name Section */}
            <Field orientation="horizontal" className="items-start">
              <div className="flex-1 min-w-0">
                <FieldTitle>Course name</FieldTitle>
                <FieldDescription>
                  The name of your course as it appears to students and in the dashboard.
                </FieldDescription>
              </div>
              <FieldContent className="w-80 shrink-0 flex items-center justify-end">
                <Button
                  variant="outline"
                  onClick={() => setNameDialogOpen(true)}
                  disabled={courseLoading}
                >
                  {"Edit Name"}
                </Button>
              </FieldContent>
            </Field>

            {/* Course Code Section */}
            <Field orientation="horizontal" className="items-start">
              <div className="flex-1 min-w-0">
                <FieldTitle>Course code</FieldTitle>
                <FieldDescription>
                  A unique code that students can use to join this course.
                </FieldDescription>
              </div>
              <FieldContent className="w-80 shrink-0 flex items-center justify-end">
                <Button
                  variant="outline"
                  onClick={() => setCodeDialogOpen(true)}
                  disabled={courseLoading}
                >
                  {"Edit Code"}
                </Button>
              </FieldContent>
            </Field>

            {/* Require Approval Section */}
            <Field orientation="horizontal" className="items-start">
              <div className="flex-1 min-w-0">
                <FieldTitle>Require approval before students join</FieldTitle>
                <FieldDescription>
                  When enabled, students must be approved by an instructor before they can access the course.
                </FieldDescription>
              </div>
              <FieldContent className="w-80 shrink-0 flex items-center justify-end">
                <Switch
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                  disabled={courseLoading}
                />
              </FieldContent>
            </Field>

            {/* Delete Course Section */}
            <Field orientation="horizontal" className="items-start border-t pt-8">
              <div className="flex-1 min-w-0">
                <FieldTitle className="text-destructive">Delete this course</FieldTitle>
                <FieldDescription>
                  Once you delete a course, there is no going back. Please be certain.
                </FieldDescription>
              </div>
              <FieldContent className="w-80 shrink-0 flex items-center justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={courseLoading || isDeleting}
                >
                  Delete course
                </Button>
              </FieldContent>
            </Field>

          </div>
        </div>
      </div>

      {/* Edit Course Name Dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit course name</DialogTitle>
            <DialogDescription>
              Update the name of your course as it appears to students and in the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveName()
                }
              }}
              disabled={courseLoading || isSavingName}
              placeholder="Course name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNameDialogOpen(false)}
              disabled={isSavingName}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveName}
              disabled={isSavingName || !nameValue.trim()}
            >
              {isSavingName ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Code Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit course code</DialogTitle>
            <DialogDescription>
              Update the unique code that students can use to join this course.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={codeValue}
              onChange={(e) => setCodeValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveCode()
                }
              }}
              disabled={courseLoading || isSavingCode}
              placeholder="Course code"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCodeDialogOpen(false)}
              disabled={isSavingCode}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCode}
              disabled={isSavingCode || !codeValue.trim()}
            >
              {isSavingCode ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the course "{courseName}" 
              and remove all associated data including threads, files, and student enrollments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCourse}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
