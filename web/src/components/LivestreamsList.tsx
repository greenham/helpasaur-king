import * as React from "react";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import CardGroup from "react-bootstrap/CardGroup";
import Badge from "react-bootstrap/Badge";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

interface LivestreamsListProps {}
interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  tags: string[];
  is_mature: boolean;
}

const sizeStreamThumbnail = (url: string, width: number, height: number) => {
  return url
    .replace("{width}", String(width))
    .replace("{height}", String(height));
};

// Function to chunk the livestreams into groups of 3
const chunkLivestreams = (arr: TwitchStream[], size: number) => {
  return arr.reduce(
    (acc: TwitchStream[][], _, i: number) =>
      i % size ? acc : [...acc, arr.slice(i, i + size)],
    []
  );
};

const getTwitchUrl = (username: string) => {
  return `https://twitch.tv/${username}`;
};

const LivestreamsList: React.FunctionComponent<LivestreamsListProps> = () => {
  const [livestreams, setLivestreams] = React.useState<Array<TwitchStream>>([]);

  React.useEffect(() => {
    fetch(`${API_URL}/api/streams/live`, {
      headers: { Authorization: String(API_KEY) },
    })
      .then((rawResponse) => rawResponse.json())
      .then((streams: Array<TwitchStream>) => {
        setLivestreams(streams);
      });
  }, []);

  const livestreamGroups = chunkLivestreams(livestreams, 4);

  return (
    <Container id="streams" className="mt-5">
      <h1>
        ALttP Streams{" "}
        <Badge bg="danger">
          <i className="fa-solid fa-tower-broadcast"></i> {livestreams.length}{" "}
          Live Now
        </Badge>
      </h1>
      <hr />
      {livestreamGroups.map((g, groupIndex) => {
        return (
          <CardGroup key={groupIndex} className="gap-4 mb-4">
            {g.map((s, streamIndex) => {
              return (
                <Card key={streamIndex} className="rounded">
                  <Card.Header>
                    <Button
                      variant="secondary"
                      href={getTwitchUrl(s.user_login)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fa-brands fa-twitch"></i> {s.user_name}
                    </Button>
                  </Card.Header>
                  <a
                    href={getTwitchUrl(s.user_login)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Card.Img
                      variant="top"
                      src={sizeStreamThumbnail(s.thumbnail_url, 320, 180)}
                    />
                  </a>
                  <Card.Body>
                    <Card.Title>
                      <a
                        href={getTwitchUrl(s.user_login)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        {s.title}
                      </a>
                    </Card.Title>
                  </Card.Body>
                  <Card.Footer className="text-muted">
                    <small>
                      <i className="fa-solid fa-stopwatch"></i> Started{" "}
                      {s.started_at}
                      <br />
                      <i className="fa-solid fa-chalkboard-user"></i>{" "}
                      {s.viewer_count} viewers
                    </small>
                  </Card.Footer>
                </Card>
              );
            })}
          </CardGroup>
        );
      })}
    </Container>
  );
};

export default LivestreamsList;
