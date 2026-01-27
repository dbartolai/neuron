"use client"

import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useParams } from "next/navigation"
import { H1, Muted } from "@/components/primitives"
import { useInstructorCourse } from "@/hooks/use-instructor-course"
import { AddContext } from "@/components/instructor/dashboard/add-context"
import { ViewContext } from "@/components/instructor/dashboard/view-context"  
import { InboxCard } from "@/components/instructor/dashboard/students"
import { InsightsCard } from "@/components/instructor/dashboard/insights"
import { TestChatCard } from "@/components/instructor/dashboard/test-chat"
import { AnnouncementInputCard } from "@/components/instructor/announcements/announcement-input-card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export default function CoursePage() {
  const { courseId } = useParams<{
    courseId: string;
  }>();

  const {courseName, courseCode, files, refetchFiles } = useInstructorCourse(courseId);

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
        <div className="flex flex-4 mt-10 justify-around">
          <div className="flex flex-col w-md gap-4">
          <InboxCard courseId={courseId}/>
            <TestChatCard/>
          </div>
          <div className="w-md">
          <AnnouncementInputCard onPostSuccess={refetchFiles}/>
          </div>

          <div>
          <InsightsCard/>

          <Tabs defaultValue="view" className="mt-8">
            <TabsList>
              <TabsTrigger value="add">Add</TabsTrigger>
              <TabsTrigger value="view">View</TabsTrigger>
            </TabsList>
            <TabsContent value="add">
              <AddContext onUploadSuccess={refetchFiles}/>
            </TabsContent>
            <TabsContent value="view">
              <ViewContext files={files} onRefetch={refetchFiles}/>
            </TabsContent>
          </Tabs>

        </div>
        </div>
        </>
  )
}
