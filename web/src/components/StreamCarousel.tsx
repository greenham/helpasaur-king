import * as React from "react"
import { useState } from "react"
import Carousel from "react-bootstrap/Carousel"
import { TwitchStream } from "../types/streams"
import StreamCard from "./StreamCard"

interface StreamCarouselProps {
  streams: TwitchStream[]
}

function StreamCarousel(props: StreamCarouselProps) {
  const { streams } = props
  const [index, setIndex] = useState<number>(0)

  const handleSelect = (selectedIndex: number) => {
    setIndex(selectedIndex)
  }

  return (
    <Carousel activeIndex={index} onSelect={handleSelect}>
      {streams.map((s, idx) => (
        <Carousel.Item>
          <StreamCard
            stream={s}
            key={idx}
            thumbnailWidth={1280}
            thumbnailHeight={720}
          />
        </Carousel.Item>
      ))}
    </Carousel>
  )
}

export default StreamCarousel
