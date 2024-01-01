import * as React from "react";
import {
  Alert,
  Badge,
  Button,
  Col,
  Container,
  ListGroup,
  Row,
  Spinner,
} from "react-bootstrap";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { getDiscordJoinUrl } from "../utils/apiService";

interface DiscordBotPageProps {}

const DiscordBotPage: React.FunctionComponent<DiscordBotPageProps> = () => {
  const [joinUrl, setJoinUrl] = React.useState<string>("");

  useEffect(() => {
    document.title = "Discord Bot | Helpasaur King";
    getDiscordJoinUrl().then((response) => {
      if (response.result === "success") {
        setJoinUrl(response.url);
      }
    });
  }, []);

  return (
    <Container id="discord-bot-page" className="my-5">
      <h1>
        <i className="fa-brands fa-discord"></i> Discord Bot{" "}
      </h1>

      <hr />

      <Row xs={1} lg={2} className="g-4">
        <Col>
          <h2 id="features">Features</h2>
          <ListGroup>
            <ListGroup.Item>
              <i className="fa-regular fa-square-check pe-1"></i>
              Responds to <Link to="/commands">static commands</Link>{" "}
              <span className="text-muted">
                (in a server <em>or</em> a DM)
              </span>
            </ListGroup.Item>
            <ListGroup.Item>
              <i className="fa-regular fa-square-check pe-1"></i>Posts alerts
              when featured <Link to="/streams">ALttP streams</Link> go live
            </ListGroup.Item>
            <ListGroup.Item>
              <i className="fa-regular fa-square-check pe-1"></i>Posts alerts
              for weekly races{" "}
              <span className="text-muted">
                (1 hour warning, race room creation)
              </span>
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col>
          <Alert variant="dark" className="p-5 border-1 border-secondary">
            <h2>Would you like the bot to join your Discord server?</h2>
            {!joinUrl && <Spinner animation="border" />}
            {joinUrl && (
              <Button
                variant="primary"
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
              >
                <i className="fa-regular fa-square-plus pe-1"></i> Add to your
                server
              </Button>
            )}
          </Alert>
        </Col>
      </Row>

      <h2 id="commands">Command List</h2>
      <p>
        Start typing <code>/helpa</code> in your server to see available
        commands.
      </p>
      <Alert variant="dark">
        <i className="fa-solid fa-pencil pe-1"></i>
        <strong>Note:</strong> These are only available to users with the{" "}
        <em>Administrator</em> role in your server!
      </Alert>
      <ListGroup>
        <ListGroup.Item variant="primary">
          <Container className="mt-2">
            <h5>Set the bot's command prefix</h5>
            <p className="p-3 border border-1 border-info rounded-3">
              <i className="fa-solid fa-terminal pe-1"></i>
              <code className="fw-bold">/helpa-prefix</code>&nbsp;
              <small className="font-monospace text-muted">
                &lt;prefix&gt;
              </small>
            </p>
            <ul>
              <li>
                <small>
                  Default: <code>!</code>
                </small>
              </li>
            </ul>
          </Container>
        </ListGroup.Item>
        <ListGroup.Item variant="primary">
          <Container className="mt-2">
            <h5>Set the cooldown for text commands (in seconds)</h5>
            <p className="p-3 border border-1 border-info rounded-3">
              <i className="fa-solid fa-terminal pe-1"></i>
              <code className="fw-bold">/helpa-cooldown</code>&nbsp;
              <small className="font-monospace text-muted">
                &lt;cooldown&gt;
              </small>
            </p>
            <ul>
              <li>
                <small>
                  Default: <code>10</code>
                </small>
              </li>
            </ul>
          </Container>
        </ListGroup.Item>
        <ListGroup.Item variant="primary">
          <Container className="mt-2">
            <h5>Manage the stream alerts feature</h5>
            <p className="p-3 border border-1 border-info rounded-3">
              <i className="fa-solid fa-terminal pe-1"></i>
              <code className="fw-bold">/helpa-streams</code>&nbsp;
              <small className="font-monospace text-muted">
                &lt;enable&gt; &lt;channel&gt;
              </small>
            </p>
            <ul>
              <li>
                <Badge>enable</Badge> - Enable or disable the feature
              </li>
              <li>
                <Badge>channel</Badge> - The text channel where stream alerts
                will be posted
              </li>
            </ul>
          </Container>
        </ListGroup.Item>
        <ListGroup.Item variant="primary">
          <Container className="mt-2">
            <h5>Manage the weekly race alerts feature</h5>
            <p className="p-3 border border-1 border-info rounded-3">
              <i className="fa-solid fa-terminal pe-1"></i>
              <code className="fw-bold">/helpa-weekly</code>&nbsp;
              <small className="font-monospace text-muted">
                &lt;one-hour-warning&gt; &lt;race-room-alert&gt; &lt;channel&gt;
                &lt;role-to-ping&gt;
              </small>
            </p>
            <ul>
              <li>
                <Badge>one-hour-warning</Badge> - Enable or disable the 1 hour
                warning before the race starts
              </li>
              <li>
                <Badge>race-room-alert</Badge> - Enable or disable the link to
                the race room once it's created
              </li>
              <li>
                <Badge>channel</Badge> - The text channel where weekly alerts
                will be posted (required if either alert is enabled)
              </li>
              <li>
                <Badge>role-to-ping</Badge> - <em>(Optional)</em> The role to
                ping when sending the alerts
              </li>
            </ul>
          </Container>
        </ListGroup.Item>
      </ListGroup>
    </Container>
  );
};

export default DiscordBotPage;
