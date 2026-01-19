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
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronDownIcon } from "lucide-react"

interface EditTimeslotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeslot: {
    id: number
    timeslot: string
    name: string
    email: string
    notes: string | null
    purpose: string | null
  }
  onSuccess: () => void
}

export function EditTimeslotDialog({
  open,
  onOpenChange,
  timeslot,
  onSuccess,
}: EditTimeslotDialogProps) {
  const { updateTimeslot } = useAdmin()
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = React.useState("")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [datePickerOpen, setDatePickerOpen] = React.useState(false)

  React.useEffect(() => {
    if (open && timeslot) {
      const timeslotDate = new Date(timeslot.timeslot)
      setSelectedDate(timeslotDate)
      const hours = timeslotDate.getHours().toString().padStart(2, "0")
      const minutes = timeslotDate.getMinutes().toString().padStart(2, "0")
      setSelectedTime(`${hours}:${minutes}`)
      setName(timeslot.name || "")
      setEmail(timeslot.email || "")
      setNotes(timeslot.notes || "")
      setPurpose(timeslot.purpose || "")
      setError(null)
    }
  }, [open, timeslot])

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      setError("Date and time are required")
      return
    }

    const [hours, minutes] = selectedTime.split(":").map(Number)
    const newDateTime = new Date(selectedDate)
    newDateTime.setHours(hours, minutes, 0, 0)

    setIsSubmitting(true)
    setError(null)

    try {
      await updateTimeslot(timeslot.id, {
        timeslot: newDateTime.toISOString(),
        name: name || undefined,
        email: email || undefined,
        notes: notes || null,
        purpose: purpose || null,
      })
      // State is updated optimistically in the hook, no need to refetch
      onOpenChange(false)
    } catch (e: any) {
      setError(e.message || "Failed to update timeslot")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedDate(undefined)
    setSelectedTime("")
    setName("")
    setEmail("")
    setNotes("")
    setPurpose("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Timeslot</DialogTitle>
          <DialogDescription>
            Update timeslot details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="date-picker">Date</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date-picker"
                    className="w-full justify-between font-normal"
                  >
                    {selectedDate ? selectedDate.toLocaleDateString() : "Select date"}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setSelectedDate(date)
                      if (date) {
                        setDatePickerOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="time-picker">Time</Label>
              <Input
                type="time"
                id="time-picker"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

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
            <Label htmlFor="email">Email</Label>
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
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
