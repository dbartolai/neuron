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


    const handleEnroll = async () => {
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
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={handleEnroll}>Enroll</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}