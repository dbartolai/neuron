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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useParams } from "next/navigation"
import { ExternalLink, Plus, Trash2, ChevronDown } from "lucide-react"
import React, { useState } from "react"
import { getAccessToken } from "@/lib/supabase/client"
import type { File } from "@/hooks/use-instructor-course"
import { DeleteFile } from "./file-delete"  
import { Muted } from "@/components/primitives"
import { formatBytes } from "@/lib/utils"

interface Props {
  files: File[]
}

export function ViewContext({ files }: Props) {
  const { courseId } = useParams<{ courseId: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const MAX_FILES = 5;
  const displayedFiles = files.slice(0, MAX_FILES);
  const hasMoreFiles = files.length > MAX_FILES;

  const handleFileClick = (fileId: string) => {
    window.open(`/file/${fileId}`, '_blank');
  };

  const FileItem = ({ file, showDelete = true }: { file: File; showDelete?: boolean }) => (
    <div 
      key={file.id} 
      className="flex items-center gap-2 group cursor-pointer hover:bg-muted/50 rounded-md p-1 -mx-1 transition-colors"
      onClick={(e) => {
        // Don't open file if clicking on delete button
        const target = e.target as HTMLElement;
        if (target.closest('button[aria-label="Delete file"]') || target.closest('[data-slot="dialog-trigger"]')) {
          return;
        }
        handleFileClick(file.id);
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
      </div>
      {showDelete && (
        <div onClick={(e) => e.stopPropagation()}>
          <DeleteFile file_id={file.id} course_id={courseId} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card className="w-md bg-card h-min">
        <CardHeader>
          <CardTitle>Course Context</CardTitle>
          <CardDescription>
            Manage course materials in Neuron.
          </CardDescription>
          <CardAction>
            <Button variant="ghost"><ExternalLink/></Button>
          </CardAction>
        </CardHeader>
        <Separator orientation="horizontal"/>
        <CardContent>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="file-0">Files</Label>

                {files.length > 0 ? (
                  <>
                    {displayedFiles.map((file) => (
                      <FileItem key={file.id} file={file} />
                    ))}
                    {hasMoreFiles && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsModalOpen(true);
                        }}
                      >
                        <ChevronDown className="mr-2 h-4 w-4" />
                        View All Files ({files.length})
                      </Button>
                    )}
                  </>
                ) : (
                  <Muted text={"No files added."} />
                )}
              </div>
            </div>
          </form>
        </CardContent>
        {files.length > 0 && (
          <CardFooter>
            <Button 
              type="button" 
              className="w-full" 
              onClick={() => setIsModalOpen(true)}
            >
              View All Files
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>All Files</DialogTitle>
            <DialogDescription>
              Click on a file to view it in a new window.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {files.map((file) => (
                <FileItem key={file.id} file={file} />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
