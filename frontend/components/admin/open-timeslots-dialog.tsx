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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useAdmin } from "@/hooks/use-admin"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { X, CheckCircle2, Circle, ChevronDownIcon } from "lucide-react"

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

function checkOverlap(newTime: Date, existingTimes: Date[]): boolean {
  const newEnd = new Date(newTime.getTime() + 30 * 60 * 1000) // Add 30 minutes
  
  for (const existing of existingTimes) {
    const existingEnd = new Date(existing.getTime() + 30 * 60 * 1000)
    
    // Check if new timeslot overlaps with existing: new_start < existing_end AND new_end > existing_start
    if (newTime < existingEnd && newEnd > existing) {
      return true
    }
  }
  
  return false
}

function getNext15MinuteIncrement(): string {
  const now = new Date()
  const currentMinutes = now.getMinutes()
  const currentHours = now.getHours()
  
  let nextMinutes: number
  let nextHours = currentHours
  
  if (currentMinutes < 15) {
    nextMinutes = 15
  } else if (currentMinutes < 30) {
    nextMinutes = 30
  } else if (currentMinutes < 45) {
    nextMinutes = 45
  } else {
    nextMinutes = 0
    nextHours = (currentHours + 1) % 24
  }
  
  return `${nextHours.toString().padStart(2, "0")}:${nextMinutes.toString().padStart(2, "0")}`
}

interface OpenTimeslotsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function OpenTimeslotsDialog({ open, onOpenChange, onSuccess }: OpenTimeslotsDialogProps) {
  const { employeeTimeslots, refetch } = useAdmin()
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = React.useState("")
  const [datePickerOpen, setDatePickerOpen] = React.useState(false)
  const [pendingTimeslots, setPendingTimeslots] = React.useState<Date[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch employee timeslots when dialog opens
  React.useEffect(() => {
    if (open) {
      void refetch()
      setPendingTimeslots([])
      setSelectedDate(undefined)
      setSelectedTime("")
      setError(null)
    }
  }, [open, refetch])

  const existingTimes = React.useMemo(() => {
    return employeeTimeslots.map((slot) => new Date(slot.timeslot))
  }, [employeeTimeslots])

  const allTimes = React.useMemo(() => {
    return [...existingTimes, ...pendingTimeslots].sort((a, b) => a.getTime() - b.getTime())
  }, [existingTimes, pendingTimeslots])

  const handleAdd = () => {
    if (!selectedDate || !selectedTime) {
      setError("Please select both date and time")
      return
    }

    // Parse time (HH:MM format)
    const [hours, minutes] = selectedTime.split(":").map(Number)
    
    // Validate minutes are :00, :15, :30, or :45
    if (![0, 15, 30, 45].includes(minutes)) {
      setError("Timeslots can only be created at :00, :15, :30, or :45 minutes")
      return
    }

    // Create date with selected date and time
    const newTime = new Date(selectedDate)
    newTime.setHours(hours, minutes, 0, 0)
    
    if (isNaN(newTime.getTime())) {
      setError("Invalid date/time")
      return
    }

    // Check overlap with existing timeslots
    if (checkOverlap(newTime, existingTimes)) {
      setError("This timeslot overlaps with an existing timeslot")
      return
    }

    // Check overlap with pending timeslots
    if (checkOverlap(newTime, pendingTimeslots)) {
      setError("This timeslot overlaps with a pending timeslot")
      return
    }

    setPendingTimeslots([...pendingTimeslots, newTime])
    setSelectedDate(undefined)
    setSelectedTime("")
    setError(null)
  }

  const handleRemovePending = (index: number) => {
    setPendingTimeslots(pendingTimeslots.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (pendingTimeslots.length === 0) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const res = await fetch(`${getApiUrl()}/admin/scheduler/timeslots`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeslots: pendingTimeslots.map((d) => d.toISOString()),
          employee_id: null, // Will be set from authenticated user
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to create timeslots" }))
        throw new Error(errorData.detail || `HTTP ${res.status}`)
      }

      onSuccess()
    } catch (e: any) {
      setError(e.message || "Failed to create timeslots")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setPendingTimeslots([])
    setSelectedDate(undefined)
    setSelectedTime("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Open Timeslots</DialogTitle>
          <DialogDescription>
            Manage your available timeslots. Each timeslot is 30 minutes long.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-2">
            <h3 className="text-sm font-medium mb-2">Your Timeslots</h3>
            {allTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeslots yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTimes.map((time, index) => {
                    const isPending = pendingTimeslots.some((pt) => pt.getTime() === time.getTime())
                    const existingSlot = employeeTimeslots.find(
                      (slot) => new Date(slot.timeslot).getTime() === time.getTime()
                    )
                    const isBooked = existingSlot?.instructor_id !== null

                    return (
                      <TableRow
                        key={index}
                        className={isPending ? "bg-muted/30" : ""}
                      >
                        <TableCell className="font-medium">
                          {formatTimeslot(time.toISOString())}
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <span className="text-xs text-muted-foreground">New</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {isBooked ? (
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {isBooked ? "Booked" : "Open"}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleRemovePending(pendingTimeslots.indexOf(time))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="date-picker" className="text-xs">Date</Label>
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
              <Label htmlFor="time-picker" className="text-xs">Time</Label>
              <Input
                type="time"
                id="time-picker"
                step="900"
                value={selectedTime}
                onChange={(e) => {
                  setSelectedTime(e.target.value)
                  setError(null)
                }}
                className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                placeholder={getNext15MinuteIncrement()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={!selectedDate || !selectedTime || isSubmitting}>
                Add
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || pendingTimeslots.length === 0}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
