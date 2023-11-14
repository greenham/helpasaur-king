import * as React from "react";
import { TwitchStream } from "../types/streams";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Stack from "react-bootstrap/Stack";
import TimeAgo from "react-timeago";
import { sizeStreamThumbnail, getTwitchUrl } from "../utils/utils";

interface StreamCardProps {
  stream: TwitchStream;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
}

function StreamCard(props: StreamCardProps) {
  const { stream } = props;
  const thumbnailWidth = props.thumbnailWidth || 320;
  const thumbnailHeight = props.thumbnailHeight || 180;
  return (
    <Card
      className="rounded h-100"
      bg={stream.isOnAlertsList ? "primary" : "dark"}
    >
      <Card.Header className="d-grid">
        <Button
          variant={stream.isOnAlertsList ? "secondary" : "primary"}
          href={getTwitchUrl(stream.user_login)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="fa-regular fa-user"></i> {stream.user_name}
        </Button>
      </Card.Header>
      <a
        href={getTwitchUrl(stream.user_login)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Card.Img
          variant="top"
          src={sizeStreamThumbnail(
            stream.thumbnail_url,
            thumbnailWidth,
            thumbnailHeight
          )}
        />
      </a>
      <Card.Body className="flex-grow-1">
        <Card.Title>
          <a
            href={getTwitchUrl(stream.user_login)}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-decoration-none`}
          >
            {stream.title}
          </a>
        </Card.Title>
      </Card.Body>
      <Card.Footer className="font-monospace">
        <Stack gap={1}>
          <small>
            <i className="fa-solid fa-stopwatch"></i> Started{" "}
            <em>
              <TimeAgo date={stream.started_at} />
            </em>
          </small>
          <small>
            <i className="fa-regular fa-eye"></i> {stream.viewer_count} viewers
          </small>
        </Stack>
      </Card.Footer>
    </Card>
  );
}

export default StreamCard;
