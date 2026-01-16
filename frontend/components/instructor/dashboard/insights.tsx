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
import { H1, Lead, Muted } from "@/components/primitives"
import React from "react"


// This card should display insights into student activity and common issues/questions


export function InsightsCard() {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <Card className="w-full max-w-md bg-card h-min">
      <CardHeader>
        <CardTitle>Insights</CardTitle>
        <CardDescription>
          Check out what students are chatting about in the course.
        </CardDescription>
        <CardAction>
          <Button variant="ghost"><ExternalLink/></Button>
        </CardAction>
      </CardHeader>
      <Separator orientation="horizontal"/>
      <CardContent>
        <Label>#TODO</Label>
      </CardContent>
      <CardFooter>
        <Button type="button"  className="w-full">
          Generate Insights
        </Button>
      </CardFooter>
    </Card>
  )
}
