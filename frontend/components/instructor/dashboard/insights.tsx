"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useParams, useRouter } from "next/navigation"
import { ExternalLink, Loader2 } from "lucide-react"
import { Muted } from "@/components/primitives"
import React from "react"
import { useInsights } from "@/hooks/use-insights"


// This card should display insights into student activity and common issues/questions


export function InsightsCard() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { status, tagStatistics, loading, unlockInsights } = useInsights(courseId || "", 3);

  const handleUnlock = async () => {
    await unlockInsights();
  };

  const handleViewInsights = () => {
    router.push(`/instructor/${courseId}/insights`);
  };

  if (!status) {
    return (
      <Card className="w-md max-w-md bg-card h-min mb-8">
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>
            Check out what students are chatting about in the course.
          </CardDescription>
        </CardHeader>
        <Separator orientation="horizontal"/>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-md max-w-md bg-card h-min">
      <CardHeader>
        <CardTitle>Insights</CardTitle>
        <CardDescription>
          Check out what students are chatting about in the course.
        </CardDescription>
        {status.is_unlocked && (
          <CardAction>
            <Button variant="ghost" onClick={handleViewInsights}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <Separator orientation="horizontal"/>
      <CardContent>
        {status.total_threads < 20 ? (
          <div className="py-4">
            <Muted text="You can see insights once students start to use Neuron" />
          </div>
        ) : !status.is_unlocked ? (
          <div className="py-4 flex flex-col items-center justify-center">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <Muted text="Generating insights..." />
              </div>
            ) : (
              <Button 
                type="button" 
                className="w-full" 
                onClick={handleUnlock}
              >
                Unlock Insights
              </Button>
            )}
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {tagStatistics.length === 0 ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              tagStatistics.slice(0, 3).map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stat.tag}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stat.count} threads
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({stat.percentage}%)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
      {status.is_unlocked && (
        <CardFooter>
          <Button 
            type="button" 
            className="w-full" 
            onClick={handleViewInsights}
            variant="outline"
          >
            View Insights
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
