"use client"

import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {H1, H3, Muted, Ul} from "@/components/primitives/index"
import { WRITING_DEFAULT, TESTING_DEFAULT, DEBUGGING_DEFAULT } from "@/lib/levels"
import { useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"


export default function CreateCourse() {

    const [courseName, setCourseName] = React.useState("");
    const [courseCode, setCourseCode] = React.useState("");
    const router = useRouter();

    const onCreate = async () => {
        console.log("Creating Course...");

        const token = await getAccessToken();

        const res = await fetch(`${getApiUrl()}/instructor/courses`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: courseName,
                code: courseCode
            })
        });

        if (!res.ok) throw new Error("Couldn't create course");

        router.push("/instructor");
    }

  return (
    <div className="h-screen overflow-y-auto chat-scroll">
    <div className="w-full min-h-screen flex flex-col items-center justify-center chat-scroll">
      <div className="w-full max-w-4xl flex flex-col items-center gap-10 py-10 ">
        <H1 text={"Configure your Course"}/>

         <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Course Name</h2>
          <p className="text-muted-foreground text-sm mb-2">What you would like to call your course.</p>
          <Input value={courseName} onChange={(e) => {setCourseName(e.target.value)}}/>
          
        </div>

         <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Course Code</h2>
          <p className="text-muted-foreground text-sm mb-2">How students will enroll.</p>
          <Input value={courseCode} onChange={(e) => {setCourseCode(e.target.value)}}/>
          
        </div>

          <Muted text="Configure custom rules after course creation."/>


        </div>
              <Button type="submit" onClick={onCreate} className="mb-5">Create Course</Button>

      </div>
    </div>
  )
}
