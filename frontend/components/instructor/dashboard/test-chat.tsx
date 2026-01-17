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


export function TestChatCard() {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <Card className="w-full max-w-md bg-card h-min mt-5">
      <CardHeader>
        <CardTitle>Test Chat</CardTitle>
        <CardDescription>
          Test the chat functionality of the course, exactly as a student sees it.
        </CardDescription>
        <CardAction>
          <Button variant="ghost" onClick={() => {window.open(`http://localhost:3000/chat/${courseId}`);}}><ExternalLink/></Button>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
