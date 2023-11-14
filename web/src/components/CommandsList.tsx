import * as React from "react";
import { useEffect } from "react";
import Badge from "react-bootstrap/Badge";
import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import LinkifyText from "./LinkifyText";
import useCommands from "../hooks/useCommands";
import { sortCommandsAlpha } from "../utils/utils";

interface CommandsListProps {}

const CommandsList: React.FunctionComponent<CommandsListProps> = () => {
  useEffect(() => {
    document.title = "Commands | Helpasaur King";
  }, []);

  const {
    data: commands,
    isLoading: commandsLoading,
    isError: commandsError,
  } = useCommands();

  const sortedCommands = sortCommandsAlpha(commands);

  return (
    <Container id="commands" className="mt-5">
      <h1>
        <i className="fa-solid fa-terminal"></i> Commands
      </h1>
      <p>
        Each of these commands will work via the Discord or Twitch bots,
        preceded by their configured prefix, which is <code>!</code> by default.
        e.g. <code>!nmg</code>
      </p>

      <Stack gap={5} className="d-xl-none">
        {sortedCommands.map((c, idx) => (
          <Card>
            <Card.Header>
              <code className="fs-3">{c.command}</code>
            </Card.Header>
            <Card.Body>
              <Card.Title>
                <LinkifyText text={c.response} />
              </Card.Title>
              <Card.Text>
                <CommandAliasesStack aliases={c.aliases} />
              </Card.Text>
            </Card.Body>
          </Card>
        ))}
      </Stack>

      <Table striped bordered hover responsive className="d-xl-block">
        <thead>
          <tr>
            <th className="text-end mw-25">Command</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {sortedCommands.map((c, index) => {
            return (
              <tr key={`command-${index}`}>
                <td className="align-middle text-end">
                  <code className="fs-3">{c.command}</code>
                  <CommandAliasesStack aliases={c.aliases} />
                </td>
                <td className="align-middle">
                  <p className="lead">
                    <LinkifyText text={c.response} />
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
};

function CommandAliasesStack(props: { aliases: string[] }) {
  const { aliases } = props;
  return (
    <Stack
      direction="horizontal"
      gap={1}
      className="justify-content-end flex-wrap"
    >
      {aliases.map((a, idx) => (
        <Badge bg="secondary" key={idx}>
          {a}
        </Badge>
      ))}
    </Stack>
  );
}

export default CommandsList;
