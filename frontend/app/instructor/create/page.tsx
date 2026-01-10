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
import {H1, H3, Muted, Ul} from "@/components/primitives/index"
import { WRITING_LEVELS, TESTING_LEVEL, DEBUGGING_LEVELS } from "@/lib/levels"


export default function CreateCourse() {
  return (
    <div className="h-screen overflow-y-auto chat-scroll">
    <div className="w-full min-h-screen flex flex-col items-center justify-center chat-scroll">
      <div className="w-full max-w-4xl flex flex-col items-center gap-10 py-10 ">
        <H1 text={"Configure your Course"}/>
        <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Writing</h2>
          <p className="text-muted-foreground text-sm mb-2">How neuron behaves in Writing mode.</p>
          <Carousel className="w-full">
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
          <h2 className="mb-3 text-lg font-medium">Test Cases</h2>
          <p className="text-muted-foreground text-sm mb-2">How neuron behaves in Testing mode.</p>
          <Carousel className="w-full">
            <CarouselContent>
              {TESTING_LEVEL.map((level, index) => (
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
          <h2 className="mb-3 text-lg font-medium">Debugging</h2>
          <p className="text-muted-foreground text-sm mb-2">How neuron behaves in Debugging mode.</p>
          <Carousel className="w-full">
            <CarouselContent>
              {DEBUGGING_LEVELS.map((level, index) => (
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
      </div>
      <Button type="submit" className="mb-5">Create Course</Button>
    </div>
    </div>
  )
}
