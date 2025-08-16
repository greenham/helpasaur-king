import * as React from "react"
import { useEffect, useState } from "react"
import { Alert, Badge, Container, Spinner } from "react-bootstrap"
import { filterStreams } from "../utils/utils"
import LivestreamsList from "../components/LivestreamsList"
import { TwitchStream } from "../types/streams"
import { useHelpaApi } from "../hooks/useHelpaApi"

interface LivestreamsPageProps {}
interface FilteredStreams {
  featured: TwitchStream[]
  other: TwitchStream[]
}

const LivestreamsPage: React.FunctionComponent<LivestreamsPageProps> = () => {
  const { useConfig, useLivestreams } = useHelpaApi()
  const {
    data: webConfig,
    isError: configError,
    isLoading: configLoading,
  } = useConfig()
  const {
    data: allStreams,
    isError: streamsError,
    isLoading: streamsLoading,
    isFetching: streamsFetching,
  } = useLivestreams()

  const [mergedStreams, setMergedStreams] = useState<Array<TwitchStream>>([])

  useEffect(() => {
    const filteredStreams: FilteredStreams = filterStreams(
      allStreams,
      webConfig
    )
    setMergedStreams(filteredStreams.featured.concat(filteredStreams.other))
  }, [allStreams])

  useEffect(() => {
    document.title = `(${mergedStreams.length}) ALttP Streams | Helpasaur King`
  }, [mergedStreams])

  if (configError || streamsError) {
    return (
      <Alert variant="danger">
        Error fetching data: {configError} {streamsError}
      </Alert>
    )
  }

  return (
    <Container id="streams" className="my-5">
      <h1>
        <i className="fa-brands fa-twitch"></i> ALttP Streams{" "}
        <small>
          <Badge bg="info">
            <i className="fa-solid fa-tower-broadcast"></i>{" "}
            {streamsLoading || streamsFetching ? (
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
        <LivestreamsList streams={mergedStreams} />
      )}
    </Container>
  )
}

export default LivestreamsPage
