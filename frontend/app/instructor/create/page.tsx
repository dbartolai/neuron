"use client"

import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import type { CarouselApi } from "@/components/ui/carousel"
import { Input } from "@/components/ui/input"
import {H1, H3, Muted, Ul} from "@/components/primitives/index"
import { WRITING_LEVELS, TESTING_LEVEL, DEBUGGING_LEVELS } from "@/lib/levels"
import { useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/supabase/client"
import { getApiUrl } from "@/lib/utils"


export default function CreateCourse() {


    const [courseName, setCourseName] = React.useState("");
    const [courseCode, setCourseCode] = React.useState("");

    const [writingIdx, setWritingIdx] = React.useState(0);
    const [testingIdx, setTestingIdx] = React.useState(0);
    const [debuggingIdx, setDebuggingIdx] = React.useState(0);

    const [writing, setWriting] = React.useState<CarouselApi | null>(null);
    const [debugging, setDebugging] = React.useState<CarouselApi | null>(null);
    const [testing, setTesting] = React.useState<CarouselApi | null>(null);


    const router = useRouter();


    React.useEffect(() => {
        if (!writing) return
        const onSelect = () => setWritingIdx(writing.selectedScrollSnap())
        onSelect() // initialize on mount
        writing.on("select", onSelect)
        return () => {writing.off("select", onSelect)}
    }, [writing])

    React.useEffect(() => {
        if (!testing) return
        const onSelect = () => setTestingIdx(testing.selectedScrollSnap())
        onSelect()
        testing.on("select", onSelect)
        return () => {testing.off("select", onSelect)}
    }, [testing])

    React.useEffect(() => {
        if (!debugging) return
        const onSelect = () => setDebuggingIdx(debugging.selectedScrollSnap())
        onSelect()
        debugging.on("select", onSelect)
        return () => {debugging.off("select", onSelect)}
    }, [debugging])

    const onCreate = async () => {
        console.log("Creating Course...");

        const payload = {
            courseName, courseCode, writingIdx, testingIdx, debuggingIdx
        };

        console.log(payload);

        const token = await getAccessToken();

        const res = await fetch(`${getApiUrl()}/instructor/courses`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: courseName,
                code: courseCode,
                writing_level: writingIdx,
                debugging_level: debuggingIdx,
                testing_level: testingIdx
            })
        });

        if (!res.ok) throw new Error("Couldn't create course");

        router.push("/instructor");
    }



  return (
    <div className="h-screen overflow-y-auto chat-scroll">
    <div className="w-full min-h-screen flex flex-col items-center justify-center chat-scroll">
      <div className="w-full max-w-4xl flex flex-col items-center gap-10 py-10 ">
        <H1 text={"Configure your Course"}/>

         <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Course Name</h2>
          <p className="text-muted-foreground text-sm mb-2">What you would like to call your course.</p>
          <Input value={courseName} onChange={(e) => {setCourseName(e.target.value)}}/>
          
        </div>

         <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Course Code</h2>
          <p className="text-muted-foreground text-sm mb-2">How students will enroll.</p>
          <Input value={courseCode} onChange={(e) => {setCourseCode(e.target.value)}}/>
          
        </div>


        <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Writing Assistance</h2>
          <p className="text-muted-foreground text-sm mb-2">How neuron behaves in Writing mode.</p>
          <Carousel className="w-full" setApi={setWriting}>
            <CarouselContent>
              {WRITING_LEVELS.map((level, index) => (
                <CarouselItem className="basis-full" key={`c1-${index}`}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex-col h-64 w-full p-6">
                        <H3 text={level.title}/>
                        <Muted text={level.description}/>
                        <Ul items={level.constraints}/>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Testing Assistance</h2>
          <p className="text-muted-foreground text-sm mb-2">How neuron behaves in Testing mode.</p>
          <Carousel className="w-full" setApi={setTesting}>
            <CarouselContent>
              {TESTING_LEVEL.map((level, index) => (
                <CarouselItem className="basis-full" key={`c2-${index}`}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex-col h-64 w-full p-6">
                        <H3 text={level.title}/>
                        <Muted text={level.description}/>
                        <Ul items={level.constraints}/>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Debugging Assistance</h2>
          <p className="text-muted-foreground text-sm mb-2">How neuron behaves in Debugging mode.</p>
          <Carousel className="w-full" setApi={setDebugging}>
            <CarouselContent>
              {DEBUGGING_LEVELS.map((level, index) => (
                <CarouselItem className="basis-full" key={`c3-${index}`}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex-col h-64 w-full p-6">
                        <H3 text={level.title}/>
                        <Muted text={level.description}/>
                        <Ul items={level.constraints}/>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
      <Button type="submit" onClick={onCreate} className="mb-5">Create Course</Button>
    </div>
    </div>
  )
}
