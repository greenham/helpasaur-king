import * as React from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Badge, Container, Spinner } from "react-bootstrap";
import { filterStreams } from "../utils/utils";
import LivestreamsList from "../components/LivestreamsList";
import { getConfig, getLivestreams } from "../utils/apiService";
import { TwitchStream } from "../types/streams";

interface LivestreamsPageProps {}
interface FilteredStreams {
  featured: TwitchStream[];
  other: TwitchStream[];
}

const LivestreamsPage: React.FunctionComponent<LivestreamsPageProps> = () => {
  useEffect(() => {
    document.title = "ALttP Streams | Helpasaur King";
  }, []);

  const configQuery = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const {
    data: webConfig,
    isError: configError,
    isLoading: configLoading,
  } = configQuery;

  const streamsQuery = useQuery({
    queryKey: ["livestreams"],
    queryFn: getLivestreams,
  });
  const {
    data: allStreams,
    isError: streamsError,
    isLoading: streamsLoading,
  } = streamsQuery;

  const [filteredStreams, setFilteredStreams] = useState<FilteredStreams>({
    featured: [],
    other: [],
  });
  const [mergedStreams, setMergedStreams] = useState<Array<TwitchStream>>([]);

  useEffect(() => {
    const filteredStreams = filterStreams(allStreams, webConfig);
    setFilteredStreams(filteredStreams);
    setMergedStreams(filteredStreams.featured.concat(filteredStreams.other));
  }, [streamsLoading]);

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
        <LivestreamsList streams={mergedStreams} config={webConfig} />
      )}
    </Container>
  );
};

export default LivestreamsPage;
