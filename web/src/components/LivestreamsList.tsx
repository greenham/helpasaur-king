import * as React from "react";
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
  const {
    data: streamAlertsConfig,
    isLoading: configLoading,
    isError: configError,
  } = useConfig("streamAlerts");
  const {
    data: allStreams,
    isLoading: streamsLoading,
    isError: streamsError,
  } = useLivestreams();

  const filteredStreams = filterStreams(allStreams, streamAlertsConfig);
  const mergedStreams = filteredStreams.featured.concat(filteredStreams.other);

  return (
    <Container id="streams" className="mt-5">
      <h1>
        ALttP Streams{" "}
        <Badge bg="danger">
          <i className="fa-solid fa-tower-broadcast"></i> {mergedStreams.length}{" "}
          Live Now
        </Badge>
      </h1>
      <hr />
      <Row xs={1} md={2} lg={3} xl={4} className="g-4">
        {mergedStreams.map((s, streamIndex) => {
          return (
            <Col key={streamIndex}>
              <StreamCard stream={s} key={streamIndex} />
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default LivestreamsList;
