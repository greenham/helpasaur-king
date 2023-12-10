import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import StreamCard from "./StreamCard";
import { TwitchStream } from "../types/streams";

interface LivestreamsListProps {
  streams: TwitchStream[];
}

const LivestreamsList: React.FunctionComponent<LivestreamsListProps> = (
  props
) => {
  const { streams } = props;

  return (
    <Row xs={1} md={2} lg={3} className="row-gap-5 col-gap-4">
      {streams.map((s, streamIndex) => {
        return (
          <Col key={streamIndex}>
            <StreamCard
              stream={s}
              key={streamIndex}
              thumbnailWidth={640}
              thumbnailHeight={360}
            />
          </Col>
        );
      })}
    </Row>
  );
};

export default LivestreamsList;
