import * as React from "react";
import { useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import useConfig from "../hooks/useConfig";
import useLivestreams from "../hooks/useLivestreams";
import StreamCard from "./StreamCard";
import { filterStreams } from "../utils/utils";

interface LivestreamsListProps {}

const LivestreamsList: React.FunctionComponent<LivestreamsListProps> = () => {
  useEffect(() => {
    document.title = "ALttP Streams | Helpasaur King";
  }, []);

  const {
    data: streamAlertsConfig,
    isLoading: configLoading,
    isError: configError,
  } = useConfig();
  const {
    data: allStreams,
    isLoading: streamsLoading,
    isError: streamsError,
  } = useLivestreams();

  const filteredStreams = filterStreams(allStreams, streamAlertsConfig);
  const mergedStreams = filteredStreams.featured.concat(filteredStreams.other);

  return (
    <Container id="streams" className="my-5">
      <h1>
        <i className="fa-brands fa-twitch"></i> ALttP Streams{" "}
        <small>
          <Badge bg="info">
            <i className="fa-solid fa-tower-broadcast"></i>{" "}
            {mergedStreams.length} Live Now
          </Badge>
        </small>
      </h1>
      <hr />
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
    </Container>
  );
};

export default LivestreamsList;
