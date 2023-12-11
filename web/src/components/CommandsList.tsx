import * as React from "react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Stack,
  Table,
} from "react-bootstrap";
import LinkifyText from "./LinkifyText";
import { Command } from "../types/commands";
import CommandFormModal from "./CommandFormModal";

interface CommandsListProps {
  commands: Command[];
  userCanEdit: boolean;
  updateCommand: (c: Command) => void;
  createCommand: (c: Command) => void;
  deleteCommand: (c: Command) => void;
}

const CommandsList: React.FunctionComponent<CommandsListProps> = (props) => {
  const { commands, userCanEdit } = props;

  // Set up searching
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [searchResults, setSearchResults] = useState<Array<Command>>([]);
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
    setSearchResults(filterCommands(commands, debouncedSearchQuery));
  }, [commands]);

  useEffect(() => {
    const filteredCommands = filterCommands(commands, debouncedSearchQuery);
    return setSearchResults(filteredCommands);
  }, [debouncedSearchQuery]);

  const freshCommand = {
    _id: "",
    command: "",
    response: "",
    aliases: [],
    enabled: true,
    category: "",
  };
  const [editCommandModalActive, setEditCommandModalActive] = useState(false);
  const hideEditCommandModal = () => setEditCommandModalActive(false);
  const showEditCommandModal = () => setEditCommandModalActive(true);
  const [commandToEdit, setCommandToEdit] = useState<Command>(freshCommand);

  const [deleteCommandModalActive, setDeleteCommandModalActive] =
    useState(false);
  const hideDeleteCommandModal = () => setDeleteCommandModalActive(false);
  const showDeleteCommandModal = () => setDeleteCommandModalActive(true);
  const [commandToDelete, setCommandToDelete] = useState<Command>(freshCommand);

  const saveCommand = async (command: Command) => {
    if (command._id !== "") {
      props.updateCommand(command);
    } else {
      props.createCommand(command);
    }
    hideEditCommandModal();
  };

  const handleDeleteConfirm = async () => {
    if (commandToDelete._id !== "") {
      props.deleteCommand(commandToDelete);
    }
    hideDeleteCommandModal();
  };

  const handleNewCommandClick = () => {
    setCommandToEdit(freshCommand);
    showEditCommandModal();
  };

  return (
    <>
      <Row
        className="sticky-top my-5 justify-content-center"
        style={{ top: "60px" }}
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

      {userCanEdit && (
        <Button
          onClick={handleNewCommandClick}
          variant="primary"
          className="mb-3"
        >
          <i className="fa-solid fa-circle-plus px-1"></i> Add a new command
        </Button>
      )}

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
              <Stack direction="horizontal">
                <code className="fs-3">{c.command}</code>
                {userCanEdit && (
                  <>
                    <Button
                      onClick={() => {
                        setCommandToEdit(c);
                        showEditCommandModal();
                      }}
                      className="ms-auto"
                      variant="dark"
                    >
                      <i className="fa-regular fa-pen-to-square"></i>
                    </Button>
                    <Button
                      variant="dark"
                      onClick={() => {
                        setCommandToDelete(c);
                        showDeleteCommandModal();
                      }}
                    >
                      <i className="fa-regular fa-trash-can"></i>
                    </Button>
                  </>
                )}
              </Stack>
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
                      <Button
                        variant="dark"
                        onClick={() => {
                          setCommandToDelete(c);
                          showDeleteCommandModal();
                        }}
                      >
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

      {editCommandModalActive && (
        <CommandFormModal
          command={commandToEdit}
          show={editCommandModalActive}
          onHide={hideEditCommandModal}
          onSubmit={saveCommand}
        />
      )}
      {deleteCommandModalActive && (
        <Modal show={deleteCommandModalActive} onHide={hideDeleteCommandModal}>
          <Modal.Header closeButton>
            <Modal.Title></Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="danger">
              Are you sure you want to delete{" "}
              <strong>{commandToDelete.command}</strong>?
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={hideDeleteCommandModal}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              <i className="fa-solid fa-delete-left px-1"></i> Confirm Delete
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export const CommandAliasesStack = (props: { aliases: string[] }) => {
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
};

export default CommandsList;
