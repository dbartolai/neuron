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

interface AddOutreachDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddOutreachDialog({ open, onOpenChange, onSuccess }: AddOutreachDialogProps) {
  const { createOutreach } = useAdmin()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [role, setRole] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setPhone("")
      setNotes("")
      setRole("")
      setPurpose("")
      setError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!email) {
      setError("Email is required")
      return
    }

    if (!role) {
      setError("Role/Interest is required")
      return
    }

    if (!purpose) {
      setError("Purpose is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createOutreach({
        name: name || null,
        email,
        notes: notes || null,
        role,
        purpose,
      })
      onSuccess()
    } catch (e: any) {
      setError(e.message || "Failed to create outreach entry")
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
          <DialogTitle>Add Outreach Entry</DialogTitle>
          <DialogDescription>
            Log an outbound outreach interaction or communication.
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
            <Label htmlFor="role">Role/Interest *</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Instructor, Student, Admin"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose *</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Demo request, Follow-up call"
              required
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
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
