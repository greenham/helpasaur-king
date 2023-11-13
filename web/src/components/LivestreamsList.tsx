import * as React from "react";
import Container from "react-bootstrap/Container";
import CardGroup from "react-bootstrap/CardGroup";
import Badge from "react-bootstrap/Badge";
import useConfig from "../hooks/useConfig";
import useLivestreams from "../hooks/useLivestreams";
import StreamCard from "./StreamCard";
import { filterStreams, chunkLivestreams } from "../utils/utils";

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
