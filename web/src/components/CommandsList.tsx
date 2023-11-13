import * as React from "react";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import LinkifyText from "./LinkifyText";
import Badge from "react-bootstrap/Badge";
import Stack from "react-bootstrap/Stack";
import { Command } from "../types/commands";
import useCommands from "../hooks/useCommands";

interface CommandsListProps {}

const sortCommandsAlpha = (commands: Array<Command>) => {
  commands.sort((a, b) => {
    if (a.command < b.command) {
      return -1;
    }
    if (a.command > b.command) {
      return 1;
    }
    return 0;
  });
  return commands;
};

const CommandsList: React.FunctionComponent<CommandsListProps> = () => {
  const {
    data: commands,
    isLoading: commandsLoading,
    isError: commandsError,
  } = useCommands();

  const sortedCommands = sortCommandsAlpha(commands);

  return (
    <Container id="commands" className="mt-5">
      <h1>Commands</h1>
      <p>
        Each of these commands will work via the Discord or Twitch bots,
        preceded by their configured prefix, which is <code>!</code> by default.
        e.g. <code>!nmg</code>
      </p>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Command</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {sortedCommands.map((c, index) => {
            return (
              <tr key={`command-${index}`}>
                <td>
                  <p>
                    <code>{c.command}</code>
                  </p>
                  <Stack direction="horizontal" gap={1}>
                    {c.aliases.map((a) => (
                      <Badge bg="secondary">{a}</Badge>
                    ))}
                  </Stack>
                </td>
                <td>
                  <LinkifyText text={c.response} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
};

export default CommandsList;
