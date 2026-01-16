"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useParams } from "next/navigation"
import { ExternalLink, Plus, Trash2 } from "lucide-react"
import React from "react"


// This card should display actionable students first
// * If a student recently added the course and needs to be approved
// * If a student asked a question and marked something for instructor review
// * If a student made some kind of post/message to instructors
// * If a student is making many problematic message requests

interface Student {
  id: string
  name: string
}

interface StudentProps {
  students: Student[]
}


export function StudentsCard({ students }: StudentProps) {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <Card className="w-full max-w-md bg-card h-min">
      <CardHeader>
        <CardTitle>Manage Students</CardTitle>
        <CardDescription>
          View information about your students.
        </CardDescription>
        <CardAction>
          <Button variant="ghost"><ExternalLink/></Button>
        </CardAction>
      </CardHeader>
      <Separator orientation="horizontal"/>
      <CardContent>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="file-0">Students</Label>

              {students.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div
                    id={`stu-${idx}`}
                    className="flex-1"
                  >
                    {item.name}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove student"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button type="button"  className="w-full">
          Add Student
        </Button>
      </CardFooter>
    </Card>
  )
}
