import * as React from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export default function CreateCourse() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center ">
      <div className="w-full max-w-4xl flex flex-col items-center gap-10 py-10">
        <div className="w-full flex flex-col items-center">
          <h2 className="mb-3 text-lg font-medium">Writing</h2>
          <p className="text-muted-foreground text-sm mb-2">How neuron behaves in Writing mode.</p>
          <Carousel className="w-full">
            <CarouselContent>
              {Array.from({ length: 8 }).map((_, index) => (
                <CarouselItem className="basis-full" key={`c1-${index}`}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex h-64 w-full items-center justify-center p-6">
                        <span className="text-4xl font-semibold">{index}</span>
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
              {Array.from({ length: 5 }).map((_, index) => (
                <CarouselItem className="basis-full" key={`c2-${index}`}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex h-64 w-full items-center justify-center p-6">
                        <span className="text-4xl font-semibold">{index}</span>
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
              {Array.from({ length: 5 }).map((_, index) => (
                <CarouselItem className="basis-full" key={`c3-${index}`}>
                  <div className="p-1">
                    <Card>
                      <CardContent className="flex h-64 w-full items-center justify-center p-6">
                        <span className="text-4xl font-semibold">{index}</span>
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
    </div>
  )
}
