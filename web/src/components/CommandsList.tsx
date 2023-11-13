import * as React from "react";
import Accordion from "react-bootstrap/Accordion";
import Badge from "react-bootstrap/Badge";
import Container from "react-bootstrap/Container";
import Stack from "react-bootstrap/Stack";
import Table from "react-bootstrap/Table";
import LinkifyText from "./LinkifyText";
import useCommands from "../hooks/useCommands";
import { sortCommandsAlpha } from "../utils/utils";

interface CommandsListProps {}

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

      <Accordion className="d-xl-none">
        {sortedCommands.map((c, idx) => (
          <Accordion.Item eventKey={String(idx)} key={idx}>
            <Accordion.Header>
              <code className="fs-3">{c.command}</code>
            </Accordion.Header>
            <Accordion.Body>
              <p className="lead">
                <LinkifyText text={c.response} />
              </p>
              <CommandAliasesStack aliases={c.aliases} />
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>

      <Table striped bordered hover responsive className="d-xl-block">
        <thead>
          <tr>
            <th className="text-end">Command</th>
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
    <Stack direction="horizontal" gap={1} className="justify-content-end">
      {aliases.map((a, idx) => (
        <Badge bg="secondary" key={idx}>
          {a}
        </Badge>
      ))}
    </Stack>
  );
}

export default CommandsList;
