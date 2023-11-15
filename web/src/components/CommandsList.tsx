import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Stack from "react-bootstrap/Stack";
import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import LinkifyText from "./LinkifyText";
import useCommands from "../hooks/useCommands";
import { sortCommandsAlpha } from "../utils/utils";
import { Command } from "../types/commands";

interface CommandsListProps {}

const CommandsList: React.FunctionComponent<CommandsListProps> = () => {
  useEffect(() => {
    document.title = "Commands | Helpasaur King";
  }, []);

  // Fetch all commands
  const {
    data: commands,
    isLoading: commandsLoading,
    isError: commandsError,
  } = useCommands();

  // Set up searching
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [searchResults, setSearchResults] = useState<Array<Command>>([]);
  const filterCommands = (commandsToFilter: Command[], query: string) => {
    if (query.length === 0) return commandsToFilter;

    const filteredCommands = commands.filter(
      (c) =>
        c.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.aliases.some((alias) =>
          alias.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        c.response.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filteredCommands;
  };

  useMemo(() => {
    return filterCommands(commands, debouncedSearchQuery);
  }, [commands, debouncedSearchQuery]);

  useEffect(() => {
    const filteredCommands = filterCommands(commands, debouncedSearchQuery);
    return setSearchResults(filteredCommands);
  }, [debouncedSearchQuery]);

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

      <Row
        className="sticky-top my-5 justify-content-center"
        style={{ top: "56px" }}
      >
        <Col xl={8}>
          <InputGroup>
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
              placeholder="Search names, aliases, or responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                }
              }}
              size="lg"
            />
          </InputGroup>
        </Col>
      </Row>

      {searchResults.length === 0 && (
        <Alert>
          No results found
          {searchQuery.length > 0 ? (
            <span>
              &nbsp; for <strong>{searchQuery}</strong>
            </span>
          ) : (
            ""
          )}
          .
        </Alert>
      )}

      {searchResults.length > 0 && (
        <Alert variant="dark">
          {searchResults.length} command
          {searchResults.length !== 1 ? "s" : ""} found.
        </Alert>
      )}

      <Stack gap={5} className="d-xl-none">
        {searchResults.map((c, idx) => (
          <Card key={idx}>
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

      {searchResults.length > 0 && (
        <Table striped bordered hover className="d-none d-xl-block">
          <thead>
            <tr>
              <th className="text-end w-25">Command</th>
              <th className="w-75">Response</th>
            </tr>
          </thead>
          <tbody>
            {searchResults.map((c, index) => {
              return (
                <tr key={`command-${index}`}>
                  <td className="align-middle text-end">
                    <code className="fs-3">{c.command}</code>
                    <CommandAliasesStack aliases={c.aliases} />
                  </td>
                  <td className="align-middle">
                    <div className="lead">
                      <LinkifyText text={c.response} />
                    </div>
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
