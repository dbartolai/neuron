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
import { useParams } from "next/navigation"
import { ExternalLink, Plus, Trash2 } from "lucide-react"
import React from "react"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"


interface Props {
  onUploadSuccess?: () => void
}

export function AddContext({ onUploadSuccess }: Props) {
  const { courseId } = useParams<{ courseId: string }>();

  const MAX_FILES = 5;
  const idRef = React.useRef(0);
  const makeId = React.useCallback(() => `f-${idRef.current++}`, []);
  const [files, setFiles] = React.useState<{ id: string; file: File | null }[]>(() => [
    { id: makeId(), file: null },
  ]);
  const [isUploading, setIsUploading] = React.useState(false);

  function handleFileChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    setFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], file };
      return next;
    });
  }

  function canAddAnother() {
    const lastSelected = files.length > 0 && files[files.length - 1].file instanceof File;
    return lastSelected && files.length < MAX_FILES;
  }

  function addAnotherInput() {
    if (!canAddAnother()) return;
    setFiles((prev) => [...prev, { id: makeId(), file: null }]);
  }

  function removeInput(index: number) {
    setFiles((prev) => {
      const next = prev.slice(0, index).concat(prev.slice(index + 1));
      return next.length === 0 ? [{ id: makeId(), file: null }] : next;
    });
  }


async function handleAddFiles() {
  const validFiles = files
      .map((f) => f.file)
      .filter((file): file is File => file !== null);

    if (validFiles.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      validFiles.forEach((file) => {
        formData.append("files", file);
      });

      const token = await getAccessToken(); 

      const res = await fetch(`${getApiUrl()}/instructor/courses/${courseId}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Uploaded successfully:", data);
      
      setFiles([{ id: makeId(), file: null }]); 
      
      // Refetch files to show the newly uploaded files
      if (onUploadSuccess) {
        await onUploadSuccess();
      }
      
      toast.success("Files uploaded successfully!");

    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }
  return (
    <Card className="w-md bg-card h-min">
      <CardHeader>
        <CardTitle>Add Course Context</CardTitle>
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
              <Label htmlFor="file-0">Add Context</Label>

              {files.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    id={`file-${idx}`}
                    type="file"
                    onChange={(e) => handleFileChange(idx, e)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove file"
                    onClick={() => removeInput(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}

              {canAddAnother() && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAnotherInput}
                  className="w-full justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another file
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          type="button" 
          onClick={handleAddFiles} 
          className="w-full relative"
          disabled={isUploading}
        >
          {isUploading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner className="size-4" />
            </span>
          )}
          <span className={isUploading ? "invisible" : ""}>Add files</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
