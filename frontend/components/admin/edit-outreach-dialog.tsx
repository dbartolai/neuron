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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAdmin } from "@/hooks/use-admin"

interface EditOutreachDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outreach: {
    id: number
    name: string
    email: string
    phone: string | null
    notes: string | null
    role: string | null
    purpose: string | null
  }
  onSuccess: () => void
}

export function EditOutreachDialog({
  open,
  onOpenChange,
  outreach,
  onSuccess,
}: EditOutreachDialogProps) {
  const { updateOutreach } = useAdmin()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [role, setRole] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && outreach) {
      setName(outreach.name || "")
      setEmail(outreach.email || "")
      setPhone(outreach.phone || "")
      setNotes(outreach.notes || "")
      setRole(outreach.role || "")
      setPurpose(outreach.purpose || "")
      setError(null)
    }
  }, [open, outreach])

  const handleSubmit = async () => {
    if (!email) {
      setError("Email is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateOutreach(outreach.id, {
        name: name || undefined,
        email,
        phone: phone || null,
        notes: notes || null,
        role: role || null,
        purpose: purpose || null,
      })
      // State is updated optimistically in the hook, no need to refetch
      onOpenChange(false)
    } catch (e: any) {
      setError(e.message || "Failed to update outreach entry")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setName("")
    setEmail("")
    setPhone("")
    setNotes("")
    setRole("")
    setPurpose("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Outreach Entry</DialogTitle>
          <DialogDescription>
            Update outreach entry details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role/Interest</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Instructor, Student, Admin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Demo request, Follow-up call"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
