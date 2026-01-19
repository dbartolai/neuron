"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAdmin } from "@/hooks/use-admin"
import { Badge } from "@/components/ui/badge"

interface TimeslotNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeslot: {
    id: number
    timeslot: string
    name: string
    email: string
    notes: string | null
    admin_notes: string | null
    instructor_id: string | null
  }
  onSuccess: () => void
}

export function TimeslotNotesDialog({
  open,
  onOpenChange,
  timeslot,
  onSuccess,
}: TimeslotNotesDialogProps) {
  const { updateTimeslot } = useAdmin()
  const [adminNotes, setAdminNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && timeslot) {
      setAdminNotes(timeslot.admin_notes || "")
      setError(null)
    }
  }, [open, timeslot])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await updateTimeslot(timeslot.id, {
        admin_notes: adminNotes || null,
      })
      // State is updated optimistically in the hook, no need to refetch
      onOpenChange(false)
    } catch (e: any) {
      setError(e.message || "Failed to update notes")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setAdminNotes(timeslot.admin_notes || "")
    setError(null)
    onOpenChange(false)
  }

  const hasInstructorNotes = timeslot.notes && timeslot.notes.trim() !== ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Timeslot Notes
            {hasInstructorNotes && (
              <Badge variant="destructive" className="ml-2">
                Instructor Notes
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View instructor notes and add admin notes for this timeslot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasInstructorNotes && (
            <div className="space-y-2">
              <Label htmlFor="instructor-notes">Instructor Notes</Label>
              <Textarea
                id="instructor-notes"
                value={timeslot.notes || ""}
                disabled
                className="bg-muted"
                rows={4}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-notes">Admin Notes</Label>
            <Textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add admin notes..."
              rows={6}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
