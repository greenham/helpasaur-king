import * as React from "react";
import { useEffect } from "react";
import Container from "react-bootstrap/Container";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";
import useConfig from "../hooks/useConfig";
import useLivestreams from "../hooks/useLivestreams";
import { filterStreams } from "../utils/utils";
import LivestreamsList from "../components/LivestreamsList";

interface LivestreamsPageProps {}

const LivestreamsPage: React.FunctionComponent<LivestreamsPageProps> = () => {
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

  if (configError || streamsError) {
    return (
      <Alert variant="danger">
        Error fetching data: {configError} {streamsError}
      </Alert>
    );
  }

  return (
    <Container id="streams" className="my-5">
      <h1>
        <i className="fa-brands fa-twitch"></i> ALttP Streams{" "}
        <small>
          <Badge bg="info">
            <i className="fa-solid fa-tower-broadcast"></i>{" "}
            {streamsLoading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              mergedStreams.length
            )}{" "}
            Live Now
          </Badge>
        </small>
      </h1>
      <hr />

      {(configLoading || streamsLoading) && (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      )}

      {!configLoading && !configError && !streamsLoading && !streamsError && (
        <LivestreamsList streams={mergedStreams} config={streamAlertsConfig} />
      )}
    </Container>
  );
};

export default LivestreamsPage;
