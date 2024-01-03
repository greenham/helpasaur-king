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

const commandGroups = [
  {
    title: "Set the bot's command prefix",
    commands: [
      {
        title: "",
        command: "/helpa-config",
        subcommand: "prefix",
        argument: "character",
        description: "The character to use as the prefix",
        defaultValue: "!",
      },
    ],
  },
  {
    title: "Set the cooldown for text commands",
    commands: [
      {
        title: "",
        command: "/helpa-config",
        subcommand: "cooldown",
        argument: "seconds",
        description: "Number of seconds before the same command can be used",
        defaultValue: "10",
      },
    ],
  },
  {
    title: "Manage the stream alerts feature",
    commands: [
      {
        title: "On/Off",
        command: "/helpa-config",
        subcommand: "stream-alerts",
        argument: "enable",
        description: "Enable or disable the stream alerts feature",
        defaultValue: "False",
      },
      {
        title: "Channel",
        command: "/helpa-config",
        subcommand: "stream-alerts-channel",
        argument: "channel",
        description: "The text channel where stream alerts will be posted",
        defaultValue: "None",
      },
    ],
  },
  {
    title: "Manage the weekly race alerts feature",
    commands: [
      {
        title: "One Hour Warning",
        command: "/helpa-config",
        subcommand: "weekly-one-hour-warning",
        argument: "enable",
        description:
          "Enable or disable the 1 hour warning before the race starts",
        defaultValue: "False",
      },
      {
        title: "Race Room Alert",
        command: "/helpa-config",
        subcommand: "weekly-race-room-alert",
        argument: "enable",
        description:
          "Enable or disable the alert with the link to the race room once created",
        defaultValue: "False",
      },
      {
        title: "Channel",
        command: "/helpa-config",
        subcommand: "weekly-alerts-channel",
        argument: "channel",
        description: "The text channel where weekly alerts will be posted",
        defaultValue: "None",
      },
      {
        title: "Role to Ping",
        command: "/helpa-config",
        subcommand: "weekly-alerts-role",
        argument: "role",
        description:
          "(Optional) The role to ping when sending the alerts -- send this command without the role argument to clear the current role",
        defaultValue: "None",
      },
    ],
  },
];

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
      <Alert variant="dark" className="border-1 border-warning">
        <i className="fa-solid fa-pencil pe-1"></i>
        <strong>Note:</strong> These are only available to users with the{" "}
        <em>Administrator</em> role in your server!
      </Alert>

      <h3>Configuration</h3>
      <ListGroup>
        {commandGroups.map((group, index) => (
          <ListGroup.Item key={index} variant="primary">
            <Container className="mt-2 py-4">
              <h4 className="text-info-emphasis"># {group.title}</h4>
              {group.commands.map((command, index) => (
                <div>
                  {command.title && <h5>&middot; {command.title}</h5>}
                  <p
                    key={index}
                    className="p-3 border border-1 border-info rounded-3"
                  >
                    <i className="fa-solid fa-terminal pe-1"></i>
                    <code className="fw-bold">{command.command}</code>&nbsp;
                    <Badge>{command.subcommand}</Badge>&nbsp;
                    <small className="font-monospace text-muted">
                      &lt;{command.argument}&gt;
                    </small>
                  </p>
                  <ul>
                    <li className="font-monospace">
                      <em>{command.argument}</em> - {command.description}{" "}
                      (Default: <code>{command.defaultValue}</code>)
                    </li>
                  </ul>
                </div>
              ))}
            </Container>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Container>
  );
};

export default DiscordBotPage;
