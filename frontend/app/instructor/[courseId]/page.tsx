"use client"

import { useState } from "react"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {useCourse} from "@/hooks/use-course"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/supabase/client"
import { H1, H2, H3, H4, Muted } from "@/components/primitives"
import { useInstructorCourse } from "@/hooks/use-instructor-course"
import { Level } from "@/components/instructor/level"
import { AddContext } from "@/components/instructor/dashboard/add-context"
import { ViewContext } from "@/components/instructor/dashboard/view-context"  
import { InboxCard } from "@/components/instructor/dashboard/students"
import { InsightsCard } from "@/components/instructor/dashboard/insights"
import { TestChatCard } from "@/components/instructor/dashboard/test-chat"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"



export default function CoursePage() {

  const params = useParams();
  console.log(params);

  const { courseId } = useParams<{
    courseId: string;
  }>();

  const router = useRouter();

  const {courseName, courseCode, writingLevel, testingLevel, debuggingLevel, files, updateCourse } = useInstructorCourse(courseId);
  console.log("NAME: ", courseName)

  const handleLevelChange = async (levelType: string, levelIdx: number) => {
    const patch: { id: string; writing_level?: number; testing_level?: number; debugging_level?: number } = {
      id: courseId
    };

    if (levelType === "writing") {
      patch.writing_level = levelIdx;
    } else if (levelType === "testing") {
      patch.testing_level = levelIdx;
    } else if (levelType === "debugging") {
      patch.debugging_level = levelIdx;
    }

    await updateCourse(patch);
  };

  return (
        <>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
        </div>
        </header>
        <div className="flex min-h-0 flex-col gap-4 p-4 pt-0 mb-8 overflow-x-hidden">
            <H1 text={courseName}/>
            <Muted text={courseCode}/>
        </div>
        <div className="flex justify-start min-h-0 gap-[5%] p-4 pt-0 overflow-x-hidden mx-auto w-[60%] min-w-[720px]">
            <div className="w-[30%]"><Level id={`w-${writingLevel}`} courseId={courseId} onLevelChange={handleLevelChange}/></div>
            <div className="w-[30%]"><Level id={`t-${testingLevel}`} courseId={courseId} onLevelChange={handleLevelChange}/></div>
            <div className="w-[30%]"><Level id={`d-${debuggingLevel}`} courseId={courseId} onLevelChange={handleLevelChange}/></div>
        </div>
        <div className="flex flex-4 mt-10 justify-around">
          <div className="flex flex-col w-md">
          <InboxCard courseId={courseId}/>
            <TestChatCard/>
          </div>
          <Tabs defaultValue="view">
            <TabsList>
              <TabsTrigger value="add">Add</TabsTrigger>
              <TabsTrigger value="view">View</TabsTrigger>
            </TabsList>
            <TabsContent value="add">
              <AddContext/>
            </TabsContent>
            <TabsContent value="view">
              <ViewContext files={files}/>
            </TabsContent>


          </Tabs>
          <InsightsCard/>
        </div>
        
        </>
  )
}
