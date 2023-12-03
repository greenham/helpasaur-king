import * as React from "react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import {
  Alert,
  Badge,
  Card,
  Col,
  Form,
  InputGroup,
  Row,
  Stack,
  Table,
} from "react-bootstrap";
import LinkifyText from "./LinkifyText";
import { Command } from "../types/commands";

interface CommandsListProps {
  commands: Command[];
  userCanEdit: boolean;
}

const CommandsList: React.FunctionComponent<CommandsListProps> = (props) => {
  const { commands, userCanEdit } = props;

  // Set up searching
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [searchResults, setSearchResults] = useState<Array<Command>>(commands);
  const filterCommands = (commandsToFilter: Command[], query: string) => {
    if (query.length === 0) return commandsToFilter;

    return commandsToFilter.filter(
      (c) =>
        c.command.toLowerCase().includes(query.toLowerCase()) ||
        c.aliases.some((alias) =>
          alias.toLowerCase().includes(query.toLowerCase())
        ) ||
        c.response.toLowerCase().includes(query.toLowerCase())
    );
  };

  useEffect(() => {
    const filteredCommands = filterCommands(commands, debouncedSearchQuery);
    return setSearchResults(filteredCommands);
  }, [debouncedSearchQuery]);

  const [editCommandModalActive, setEditCommandModalActive] = useState(false);
  const hideEditCommandModal = () => setEditCommandModalActive(false);
  const showEditCommandModal = () => setEditCommandModalActive(true);

  const [commandToEdit, setCommandToEdit] = useState<Command>({
    _id: "",
    command: "",
    response: "",
    aliases: [],
    enabled: true,
    category: "",
  });

  return (
    <>
      <Row
        className="sticky-top my-5 justify-content-center"
        style={{ top: "56px" }}
      >
        <Col xl={6}>
          <InputGroup className="border border-primary border-2 rounded">
            <Form.Control
              type="text"
              placeholder="Search names, aliases, or responses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                } else if (e.key == "Enter") {
                  e.currentTarget.blur();
                }
              }}
              size="lg"
            />
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
              <Card.Text as="div">
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
              {userCanEdit && <th></th>}
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
                  {userCanEdit && (
                    <td>
                      <Button
                        variant="dark"
                        onClick={() => {
                          setCommandToEdit(c);
                          showEditCommandModal();
                        }}
                      >
                        <i className="fa-regular fa-pen-to-square"></i>
                      </Button>
                      <Button variant="dark">
                        <i className="fa-regular fa-trash-can"></i>
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* <span className="text-secondary"></span> */}
      <Modal show={editCommandModalActive} onHide={hideEditCommandModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {`Editing: ${commandToEdit.command}` || "New Command"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FloatingLabel
            controlId="commandName"
            label="Command name"
            className="mb-3"
          >
            <Form.Control
              type="text"
              placeholder="obaeb"
              value={commandToEdit.command}
            />
          </FloatingLabel>
          <FloatingLabel controlId="commandResponse" label="Response">
            <Form.Control
              as="textarea"
              placeholder="Stop! Don't shoot fire stick in space canoe! Cause explosive decompression! You can crush me but you can't crush my spirit! Why, those are the Grunka-Lunkas! They work here in the Slurm factory. If rubbin' frozen dirt in your crotch is wrong, hey I don't wanna be right."
              style={{ height: "200px" }}
              value={commandToEdit.response}
            />
          </FloatingLabel>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={hideEditCommandModal}>
            Close
          </Button>
          <Button variant="dark" onClick={hideEditCommandModal}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
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
