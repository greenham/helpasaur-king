import * as React from "react";
import Container from "react-bootstrap/Container";
import CardGroup from "react-bootstrap/CardGroup";
import Badge from "react-bootstrap/Badge";
import useConfig from "../hooks/useConfig";
import { TwitchStream } from "../types/streams";
import StreamCard from "./StreamCard";
import { filterStreams } from "../utils/utils";
import { chunkLivestreams } from "../utils/utils";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

interface LivestreamsListProps {}

const LivestreamsList: React.FunctionComponent<LivestreamsListProps> = () => {
  const [allStreams, setAllStreams] = React.useState<Array<TwitchStream>>([]);
  const {
    config: streamAlertsConfig,
    isLoading: configLoading,
    isError: configError,
  } = useConfig("streamAlerts");

  // Get livestreams from API
  React.useEffect(() => {
    fetch(`${API_URL}/streams/live`, {
      headers: { Authorization: String(API_KEY) },
    })
      .then((rawResponse) => rawResponse.json())
      .then((streams: Array<TwitchStream>) => {
        setAllStreams(streams);
      });
  }, []);

  const filteredStreams = filterStreams(allStreams, streamAlertsConfig?.config);
  const mergedStreams = filteredStreams.featured.concat(filteredStreams.other);
  const livestreamGroups = chunkLivestreams(mergedStreams, 4);

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
      {livestreamGroups.map((g, groupIndex) => {
        return (
          <CardGroup key={groupIndex} className="gap-4 mb-5">
            {g.map((s, streamIndex) => {
              return <StreamCard stream={s} key={streamIndex} />;
            })}
          </CardGroup>
        );
      })}
    </Container>
  );
};

export default LivestreamsList;
