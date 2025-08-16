import * as React from "react"
import { TwitchStream } from "@helpasaur/api-client"
import Card from "react-bootstrap/Card"
import Badge from "react-bootstrap/Badge"
import Button from "react-bootstrap/Button"
import Stack from "react-bootstrap/Stack"
import TimeAgo from "react-timeago"
import { sizeStreamThumbnail, getTwitchUrl } from "../utils/utils"

interface StreamCardProps {
  stream: TwitchStream
  thumbnailWidth?: number
  thumbnailHeight?: number
}

function StreamCard(props: StreamCardProps) {
  const { stream } = props
  const thumbnailWidth = props.thumbnailWidth || 320
  const thumbnailHeight = props.thumbnailHeight || 180
  return (
    <Card
      className="rounded h-100"
      bg={stream.isOnAlertsList ? "primary" : "dark"}
    >
      <Card.Header className="d-grid p-0">
        <Button
          variant={stream.isOnAlertsList ? "secondary" : "primary"}
          href={getTwitchUrl(stream.userName)}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3"
        >
          <h5>
            <i className="fa-regular fa-user"></i> {stream.userName}
          </h5>
        </Button>
      </Card.Header>
      <a
        href={getTwitchUrl(stream.userName)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Card.Img
          variant="top"
          src={sizeStreamThumbnail(
            stream.thumbnailUrl,
            thumbnailWidth,
            thumbnailHeight
          )}
        />
      </a>
      <Card.Body className="flex-grow-1">
        <Card.Title>
          <p className="py-2 fw-bold">
            <a
              href={getTwitchUrl(stream.userName)}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-decoration-none link-light`}
            >
              {stream.title}
            </a>
          </p>
        </Card.Title>
      </Card.Body>
      <Card.Footer className="bg-dark">
        <Stack gap={1} className="font-monospace">
          <small>
            <i className="fa-regular fa-eye"></i> {stream.viewers} viewers
          </small>
          <small>
            <i className="fa-solid fa-stopwatch"></i> Started{" "}
            <em>
              <TimeAgo date={stream.startDate} />
            </em>
          </small>
          <Stack direction="horizontal" gap={1}>
            {stream.tags.slice(0, 3).map((t, i) => (
              <Badge key={i}>{t}</Badge>
            ))}
          </Stack>
        </Stack>
      </Card.Footer>
    </Card>
  )
}

export default StreamCard
