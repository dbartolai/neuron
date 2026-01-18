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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAdmin } from "@/hooks/use-admin"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"

function formatTimeslot(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface BookTimeslotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BookTimeslotDialog({ open, onOpenChange, onSuccess }: BookTimeslotDialogProps) {
  const { outreach, availableTimeslots, refetch } = useAdmin()
  const [useOutreach, setUseOutreach] = React.useState(false)
  const [selectedOutreachId, setSelectedOutreachId] = React.useState<string>("")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [selectedTimeslotId, setSelectedTimeslotId] = React.useState<string>("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch data when dialog opens
  React.useEffect(() => {
    if (open) {
      void refetch()
      // Reset form
      setUseOutreach(false)
      setSelectedOutreachId("")
      setName("")
      setEmail("")
      setNotes("")
      setPurpose("")
      setSelectedTimeslotId("")
      setError(null)
    }
  }, [open, refetch])

  // Populate form when outreach is selected
  React.useEffect(() => {
    if (useOutreach && selectedOutreachId) {
      const selectedOutreach = outreach.find((o) => o.id.toString() === selectedOutreachId)
      if (selectedOutreach) {
        setName(selectedOutreach.name || "")
        setEmail(selectedOutreach.email)
        setNotes(selectedOutreach.notes || "")
        setPurpose(selectedOutreach.role || "")
      }
    }
  }, [useOutreach, selectedOutreachId, outreach])

  const handleSubmit = async () => {
    if (!selectedTimeslotId) {
      setError("Please select a timeslot")
      return
    }

    if (!name || !email) {
      setError("Name and email are required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/admin/scheduler/book`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeslot_id: parseInt(selectedTimeslotId),
          name,
          email,
          notes: notes || null,
          purpose: purpose || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to book timeslot" }))
        throw new Error(errorData.detail || `HTTP ${res.status}`)
      }

      onSuccess()
    } catch (e: any) {
      setError(e.message || "Failed to book timeslot")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setUseOutreach(false)
    setSelectedOutreachId("")
    setName("")
    setEmail("")
    setNotes("")
    setPurpose("")
    setSelectedTimeslotId("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Timeslot</DialogTitle>
          <DialogDescription>
            Book an available timeslot for a meeting or call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={useOutreach ? "default" : "outline"}
              onClick={() => setUseOutreach(true)}
              className="flex-1"
            >
              Select from Outreach
            </Button>
            <Button
              type="button"
              variant={!useOutreach ? "default" : "outline"}
              onClick={() => setUseOutreach(false)}
              className="flex-1"
            >
              Enter Manually
            </Button>
          </div>

          {useOutreach && (
            <div className="space-y-2">
              <Label>Select Outreach Entry</Label>
              <Select value={selectedOutreachId} onValueChange={setSelectedOutreachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an outreach entry" />
                </SelectTrigger>
                <SelectContent>
                  {outreach.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name || item.email} - {item.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="timeslot">Timeslot *</Label>
            <Select value={selectedTimeslotId} onValueChange={setSelectedTimeslotId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an available timeslot" />
              </SelectTrigger>
              <SelectContent>
                {availableTimeslots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id.toString()}>
                    {formatTimeslot(slot.timeslot)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Enter purpose"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes"
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
            {isSubmitting ? "Booking..." : "Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
