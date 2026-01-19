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
import { Input } from "@/components/ui/input"
import { useAdmin } from "@/hooks/use-admin"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronDownIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface MassTimeslotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

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

function generateTimeslots(startTime: Date, endTime: Date): Date[] {
  const timeslots: Date[] = []
  let current = new Date(startTime)
  current.setSeconds(0, 0)

  // Round to nearest :00 or :30
  if (current.getMinutes() > 30) {
    current.setMinutes(0)
    current.setHours(current.getHours() + 1)
  } else if (current.getMinutes() > 0) {
    current.setMinutes(30)
  }

  while (current <= endTime) {
    timeslots.push(new Date(current))
    current = new Date(current.getTime() + 30 * 60 * 1000) // Add 30 minutes
  }

  return timeslots
}

export function MassTimeslotDialog({
  open,
  onOpenChange,
  onSuccess,
}: MassTimeslotDialogProps) {
  const { massCreateTimeslots } = useAdmin()
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = React.useState("")
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [endTime, setEndTime] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [startDatePickerOpen, setStartDatePickerOpen] = React.useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = React.useState(false)

  const previewTimeslots = React.useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime) {
      return []
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const [endHours, endMinutes] = endTime.split(":").map(Number)

    const start = new Date(startDate)
    start.setHours(startHours, startMinutes, 0, 0)

    const end = new Date(endDate)
    end.setHours(endHours, endMinutes, 0, 0)

    if (start >= end) {
      return []
    }

    return generateTimeslots(start, end)
  }, [startDate, startTime, endDate, endTime])

  React.useEffect(() => {
    if (open) {
      setStartDate(undefined)
      setStartTime("")
      setEndDate(undefined)
      setEndTime("")
      setError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Please select both start and end date/time")
      return
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const [endHours, endMinutes] = endTime.split(":").map(Number)

    const start = new Date(startDate)
    start.setHours(startHours, startMinutes, 0, 0)

    const end = new Date(endDate)
    end.setHours(endHours, endMinutes, 0, 0)

    if (start >= end) {
      setError("Start time must be before end time")
      return
    }

    if (previewTimeslots.length === 0) {
      setError("No valid timeslots generated")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await massCreateTimeslots(start.toISOString(), end.toISOString())
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      setError(e.message || "Failed to create timeslots")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setStartDate(undefined)
    setStartTime("")
    setEndDate(undefined)
    setEndTime("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mass Create Timeslots</DialogTitle>
          <DialogDescription>
            Create multiple timeslots at :00 and :30 intervals between start and end time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    {startDate ? startDate.toLocaleDateString() : "Select date"}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setStartDate(date)
                      if (date) {
                        setStartDatePickerOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    {endDate ? endDate.toLocaleDateString() : "Select date"}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setEndDate(date)
                      if (date) {
                        setEndDatePickerOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          {previewTimeslots.length > 0 && (
            <div className="space-y-2">
              <Label>Preview: {previewTimeslots.length} timeslots will be created</Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timeslot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewTimeslots.slice(0, 20).map((slot, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{formatTimeslot(slot.toISOString())}</TableCell>
                      </TableRow>
                    ))}
                    {previewTimeslots.length > 20 && (
                      <TableRow>
                        <TableCell className="text-muted-foreground text-sm">
                          ... and {previewTimeslots.length - 20} more
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || previewTimeslots.length === 0}>
            {isSubmitting ? "Creating..." : `Create ${previewTimeslots.length} Timeslots`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
