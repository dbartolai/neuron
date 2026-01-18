"use client"

import * as React from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"


type Item = {
    title: string
    url: string
    icon: LucideIcon
}

type CourseEnrollProps = {
  item: Item
}


export default function CourseEnroll({ item }: CourseEnrollProps) {

    const [codeInput, setCodeInput] = React.useState<string>("ABC101-12345")
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const router = useRouter()

    const handleEnroll = async () => {
        setIsLoading(true)
        try {
            console.log(`Enrolling: ${codeInput}`)

            const token = await getAccessToken();

            const code = codeInput;

            const res = await fetch(`${getApiUrl()}/student/enroll`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ code })
            });

            if (!res.ok) throw new Error(`couldn't enroll ${res.status}`);

            const data = await res.json();
            const courseId = data.course_id;

            router.push(`/chat/${courseId}`);
        } catch (error) {
            console.error("Enrollment error:", error);
            setIsLoading(false);
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild >
                <Button size={"sm"} variant={"ghost"} >
                <item.icon />
                <span>{item.title}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>Add a new Course</DialogTitle>
                <DialogDescription>Enter a course code from your professor to start learning with neuron!</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                <div className="grid gap-3">
                    <Label htmlFor="course-code">Code</Label>
                    <Input id="course-code" name="code" value={codeInput} onChange={(e) => setCodeInput(e.target.value) } />
                </div>
                </div>
                <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline" disabled={isLoading}>Cancel</Button>
                </DialogClose>
                <Button 
                    type="submit" 
                    onClick={handleEnroll}
                    disabled={isLoading}
                    className="relative"
                >
                    {isLoading && (
                        <span className="absolute inset-0 flex items-center justify-center">
                            <Spinner className="size-4" />
                        </span>
                    )}
                    <span className={isLoading ? "invisible" : ""}>Enroll</span>
                </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}