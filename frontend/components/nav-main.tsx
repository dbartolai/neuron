"use client"

import * as React from "react"
import { ChevronRight, MoreHorizontal, Pencil, Trash2, type LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export function NavMain({
  items,
  updateThreadName,
  deleteThread,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      id?: string
    }[]
  }[]
  updateThreadName?: (threadId: string, newName: string) => Promise<void>
  deleteThread?: (threadId: string) => Promise<void>
}) {
  const [editingThreadId, setEditingThreadId] = React.useState<string | null>(null)
  const [editingValue, setEditingValue] = React.useState<string>("")
  const [hoveredThreadId, setHoveredThreadId] = React.useState<string | null>(null)

  const handleStartEdit = (threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId)
    setEditingValue(currentTitle)
  }

  const handleSaveEdit = async (threadId: string) => {
    if (!updateThreadName || !editingValue.trim()) {
      setEditingThreadId(null)
      return
    }

    try {
      await updateThreadName(threadId, editingValue.trim())
      setEditingThreadId(null)
      setEditingValue("")
    } catch (error) {
      console.error("Failed to update thread name:", error)
      // Keep editing state on error so user can retry
    }
  }

  const handleCancelEdit = () => {
    setEditingThreadId(null)
    setEditingValue("")
  }

  const handleDelete = async (threadId: string) => {
    if (!deleteThread) return

    if (confirm("Are you sure you want to delete this thread?")) {
      try {
        await deleteThread(threadId)
      } catch (error) {
        console.error("Failed to delete thread:", error)
      }
    }
  }
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Courses</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRight />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isThread = subItem.id !== undefined
                        const isEditing = editingThreadId === subItem.id
                        const itemKey = subItem.id || subItem.url

                        const isHovered = hoveredThreadId === subItem.id

                        return (
                          <SidebarMenuSubItem 
                            key={itemKey}
                            onMouseEnter={() => subItem.id && setHoveredThreadId(subItem.id)}
                            onMouseLeave={() => setHoveredThreadId(null)}
                          >
                            <div className="flex items-center w-full gap-1">
                              {isEditing ? (
                                <Input
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => subItem.id && handleSaveEdit(subItem.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && subItem.id) {
                                      e.preventDefault()
                                      handleSaveEdit(subItem.id)
                                    } else if (e.key === "Escape") {
                                      e.preventDefault()
                                      handleCancelEdit()
                                    }
                                  }}
                                  className="h-8 flex-1"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                  onFocus={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <>
                                  <SidebarMenuSubButton asChild className="flex-1 min-w-0">
                                    <Link href={subItem.url}>
                                      <span className="truncate">{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                  {isThread && updateThreadName && deleteThread && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className={`${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity p-1 rounded hover:bg-sidebar-accent shrink-0`}
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                          }}
                                          onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                          }}
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                          <span className="sr-only">Thread options</span>
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" side="right">
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (subItem.id) {
                                              handleStartEdit(subItem.id, subItem.title)
                                            }
                                          }}
                                        >
                                          <Pencil className="h-4 w-4 mr-2" />
                                          Change name
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (subItem.id) {
                                              handleDelete(subItem.id)
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </>
                              )}
                            </div>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
