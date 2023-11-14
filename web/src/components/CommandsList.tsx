import * as React from "react";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
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

  const [searchQuery, setSearchQuery] = useState("");
  const {
    data: commands,
    isLoading: commandsLoading,
    isError: commandsError,
  } = useCommands();

  const filteredCommands =
    searchQuery.length > 0
      ? commands.filter(
          (c) =>
            c.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.aliases.some((alias) =>
              alias.toLowerCase().includes(searchQuery.toLowerCase())
            ) ||
            c.response.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : commands;
  const sortedCommands = sortCommandsAlpha(filteredCommands);

  return (
    <Container id="commands" className="mt-5">
      <h1>
        <i className="fa-solid fa-terminal"></i> Commands
      </h1>
      <p className="lead">
        Each of these commands will work via the Discord or Twitch bots,
        preceded by their configured prefix, which is <code>!</code> by default.
        e.g. <code>!nmg</code>
      </p>

      <InputGroup className="mb-3 mw-50 sticky-top" style={{ top: "56px" }}>
        <InputGroup.Text id="search-icon">
          {searchQuery.length > 0 ? (
            <i
              className="fa-regular fa-circle-xmark p-2"
              onClick={() => setSearchQuery("")}
              style={{ cursor: "pointer" }}
            ></i>
          ) : (
            <i className="fa-solid fa-magnifying-glass p-2"></i>
          )}
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="lg"
        />
      </InputGroup>

      {sortedCommands.length === 0 && (
        <Alert>
          No results found for <strong>{searchQuery}</strong>.
        </Alert>
      )}

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

      {sortedCommands.length > 0 && (
        <Table striped bordered hover className="d-none d-xl-block">
          <thead>
            <tr>
              <th className="text-end w-25">Command</th>
              <th className="w-75">Response</th>
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
      )}
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
