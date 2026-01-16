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
import { getAccessToken } from "@/lib/supabase/client"
import type { File } from "@/hooks/use-instructor-course"
import { DeleteFile } from "./file-delete"  
import { Muted } from "@/components/primitives"

interface Props {
  files: File[]
}

export function ViewContext({ files }: Props) {
  const { courseId } = useParams<{ courseId: string }>();

  const MAX_FILES = 5;
  return (
    <Card className="w-md bg-card h-min">
      <CardHeader>
        <CardTitle>Course Context</CardTitle>
        <CardDescription>
          Manage course materials in Neuron.
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
              <Label htmlFor="file-0">Files</Label>

              {files.length > 0 ? files.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div
                    id={`file-${idx}`}
                    className="flex-1"
                  >
                    {item.name}
                  </div>
                  <DeleteFile file_id={item.id} course_id={courseId}/>
                </div>
              )) : <Muted text={"No files added."}/> }
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button type="button" className="w-full">
          View Files
        </Button>
      </CardFooter>
    </Card>
  )
}
