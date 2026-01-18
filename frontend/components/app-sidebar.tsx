"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  GraduationCap,
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

import { useSidebar } from "@/hooks/use-sidebar"
import { useParams } from "next/navigation"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"



export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { courseId } = useParams<{ courseId?: string; threadId?: string}>()

  const { courses, user, isLoading, error } = useSidebar();
  const [isInstructor, setIsInstructor] = React.useState(false);
  const [link, setLink] = React.useState("/chat");

  React.useEffect(() => {
    async function checkInstructorRole() {
      try {
        const token = await getAccessToken()
        const res = await fetch(`${getApiUrl()}/users/role`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const role = await res.json()
          setIsInstructor(role === "instructor")
          setLink(role === "instructor" ? `/instructor/${courseId}` : "/chat");
        }
      } catch (error) {
        // Silently fail - user is not instructor
        setIsInstructor(false)
      }
    }

    checkInstructorRole()
  }, [])

  const navMain = React.useMemo(() => {
    return courses.map((c) => ({
      title: c.title,
      url: c.url,
      icon: c.icon,
      isActive: courseId === c.id,
      items: c.items,
    }));
  }, [courses, courseId]);

  const navSecondaryItems = React.useMemo(() => {
    if (isInstructor && courseId) {
      return [
        { title: "Instructor View", url: `/instructor/${courseId}`, icon: GraduationCap },
      ]
    }
    return [
      { title: "Add Course", url: "#", icon: PlusCircle },
    ]
  }, [isInstructor, courseId]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={link}>
                <div className=" text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img src="/c.png" alt="neuron" className="size-8" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">neuron</span>
                  <span className="truncate text-xs font-serif">by ceria</span>
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
        {/* <NavProjects projects={data.projects} /> */}
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user}/>}
      </SidebarFooter>
    </Sidebar>
  )
}
