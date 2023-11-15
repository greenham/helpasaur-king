import * as React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import StreamCard from "./StreamCard";
import { filterStreams } from "../utils/utils";
import { StreamAlertsConfig, TwitchStream } from "../types/streams";

interface LivestreamsListProps {
  streams: TwitchStream[];
  config: StreamAlertsConfig;
}

const LivestreamsList: React.FunctionComponent<LivestreamsListProps> = (
  props
) => {
  const { streams, config } = props;
  const filteredStreams = filterStreams(streams, config);
  const mergedStreams = filteredStreams.featured.concat(filteredStreams.other);

  return (
    <Row xs={1} md={2} lg={3} className="row-gap-5 col-gap-4">
      {mergedStreams.map((s, streamIndex) => {
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
