"use client"

import { useInstructor } from "@/hooks/use-instructor"
import CourseSelect from "@/components/chat/course-select"
import EmptyDashboard from "@/components/instructor/empty"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import H1 from "@/components/primitives/h1"


export default function Page() {

    const { courses , isLoading } = useInstructor();

    console.log(courses);

    if (isLoading) {
        return (
          <>
            <header className="flex h-16 shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
              </div>
            </header>
      
            <div className="flex items-center justify-center h-full">
              <Skeleton className="w-xl h-xl" />
            </div>
          </>
        )
      }
      
    
    return (
        <>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
            </div>
          </header>
      
          {courses.length > 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <h3 className="text-lg mb-3">Select a course to manage.</h3>
              <div className="flex flex-col gap-2 max-w-md">
                {courses.map(c => (
                  <CourseSelect
                    key={c.id}
                    name={c.title}
                    url={c.url}
                    icon={c.icon}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyDashboard />
          )}
        </>
      )
      }