"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  PlusCircle,
  Send,
  Settings2,
  SquareTerminal,
} from "lucide-react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useInstructor } from "@/hooks/use-instructor"
import { useParams } from "next/navigation"
import { Muted, MutedLeft } from "./primitives"
import { getFrontendUrl } from "@/lib/utils"



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { courseId } = useParams<{ courseId?: string; threadId?: string}>()

  const { courses, user, isLoading, error } = useInstructor();


  const navMain = React.useMemo(() => {
    return courses.map((c) => ({
      title: c.title,
      url: c.url,
      icon: c.icon,
      isActive: courseId === c.id,
      items: [
      {
        title: `Overview`,
        url: `${getFrontendUrl()}/instructor/${c.id}`
      },
      {
        title: `Students`,
        url: `${getFrontendUrl()}/instructor/students?courseId=${c.id}`
      },
      {
        title: `Insights`,
        url: `${getFrontendUrl()}/instructor/${c.id}/insights`
      }
      ]
    }));
  }, [courses, courseId]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">neuron</span>
                  <span className="truncate text-xs">by ceria</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
       {isLoading && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Loading courses…
          </div>
        )}

        {error && (
          <div className="px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isLoading && !error && <NavMain items={navMain} />}
        {!isLoading && !error && courses.length === 0 && <div className="mt-0"><Muted text="No courses yet"/></div>}
        {/* <NavProjects projects={data.projects} /> */}
        <NavSecondary items={[
          {title: "New Course", url: `${getFrontendUrl()}/instructor/create`, icon: PlusCircle,},
        ]} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user}/>}
      </SidebarFooter>
    </Sidebar>
  )
}
