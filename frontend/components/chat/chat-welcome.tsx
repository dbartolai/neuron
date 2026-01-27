"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { WRITING_DEFAULT, TESTING_DEFAULT, DEBUGGING_DEFAULT } from "@/lib/levels"
import { CoursePolicy } from "@/hooks/use-course"
import { H1 } from "../primitives"

type ThreadType = "writing" | "testing" | "debugging"

type ChatWelcomeProps = {
  courseName: string
  policy: CoursePolicy | null
  selectedMode: ThreadType
  onModeChange: (mode: ThreadType) => void
  courseLoading: boolean
  policyLoading: boolean
}

export default function ChatWelcome({
  courseName,
  policy,
  selectedMode,
  onModeChange,
  courseLoading,
  policyLoading,
}: ChatWelcomeProps) {
  // Get level info based on selected mode
  const getLevelInfo = () => {
    if (selectedMode === "writing") {
      return WRITING_DEFAULT
    } else if (selectedMode === "testing") {
      return TESTING_DEFAULT
    } else {
      return DEBUGGING_DEFAULT
    }
  }

  const levelInfo = getLevelInfo()
  const isModeDisabled = (mode: ThreadType) => {
    // Modes are never disabled now - they always use defaults
    return false
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-3xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-6 w-full">
        {/* Greeting */}
        <div className="text-center">
          {courseLoading ? (
            <>
              <Skeleton className="h-10 w-[60%] mx-auto mb-2" />
              <Skeleton className="h-4 w-[40%] mx-auto" />
            </>
          ) : (
            <>
              <H1 text={`${courseName}`} />
              <p className="text-muted-foreground">Select a mode to get started</p>
            </>
          )}
        </div>

        {/* Level Info Card */}
        {policyLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[80%] mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
          </Card>
        ) : (
          levelInfo && (
            <Card>
              <CardHeader>
                <CardTitle>{levelInfo.title}</CardTitle>
                <CardDescription>{levelInfo.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        )}

        {/* Mode Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Chat Mode</label>
          {policyLoading ? (
            <Tabs value={selectedMode}>
              <TabsList className="w-full">
                <Skeleton className="h-9 flex-1 rounded-md" />
                <Skeleton className="h-9 flex-1 rounded-md" />
                <Skeleton className="h-9 flex-1 rounded-md" />
              </TabsList>
            </Tabs>
          ) : (
            <Tabs value={selectedMode} onValueChange={(value) => onModeChange(value as ThreadType)}>
              <TabsList className="w-full">
                <TabsTrigger 
                  value="writing" 
                  className="flex-1"
                  disabled={isModeDisabled("writing")}
                >
                  Write
                </TabsTrigger>
                <TabsTrigger 
                  value="testing" 
                  className="flex-1"
                  disabled={isModeDisabled("testing")}
                >
                  Test
                </TabsTrigger>
                <TabsTrigger 
                  value="debugging" 
                  className="flex-1"
                  disabled={isModeDisabled("debugging")}
                >
                  Debug
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
