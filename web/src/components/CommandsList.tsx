import * as React from "react"
import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { useDebounce } from "use-debounce"
import { UseMutationResult } from "@tanstack/react-query"
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
} from "react-bootstrap"
import LinkifyText from "./LinkifyText"
import { Command } from "@helpasaur/api-client"
import CommandFormModal from "./CommandFormModal"

interface CommandsListProps {
  commands: Command[]
  userCanEdit: boolean
  createCommandMutation: UseMutationResult<any, any, Partial<Command>, any>
  updateCommandMutation: UseMutationResult<any, any, Partial<Command>, any>
  deleteCommandMutation: UseMutationResult<any, any, Command, any>
}

const CommandsList: React.FunctionComponent<CommandsListProps> = (props) => {
  const {
    commands,
    userCanEdit,
    createCommandMutation,
    updateCommandMutation,
    deleteCommandMutation,
  } = props

  // Set up searching
  const { hash } = useLocation()
  const [searchQuery, setSearchQuery] = useState(hash.replace("#", ""))
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500)
  const [searchResults, setSearchResults] = useState<Array<Command>>([])
  const filterCommands = (commandsToFilter: Command[], query: string) => {
    if (query.length === 0) return commandsToFilter

    return commandsToFilter.filter(
      (c) =>
        c.command.toLowerCase().includes(query.toLowerCase()) ||
        c.aliases.some((alias) =>
          alias.toLowerCase().includes(query.toLowerCase())
        ) ||
        c.response.toLowerCase().includes(query.toLowerCase())
    )
  }

  // Handle updates to the location hash
  useEffect(() => {
    setSearchQuery(hash.replace("#", ""))
  }, [hash])

  useEffect(() => {
    setSearchResults(filterCommands(commands, debouncedSearchQuery))
    window.location.replace("#" + debouncedSearchQuery)
  }, [debouncedSearchQuery, commands])

  const freshCommand = {
    _id: "",
    command: "",
    response: "",
    aliases: [],
    enabled: true,
    category: "",
    aliasesText: "",
  }
  const [editCommandModalActive, setEditCommandModalActive] = useState(false)
  const hideEditCommandModal = () => setEditCommandModalActive(false)
  const showEditCommandModal = () => setEditCommandModalActive(true)
  const [commandToEdit, setCommandToEdit] =
    useState<Partial<Command>>(freshCommand)

  const [deleteCommandModalActive, setDeleteCommandModalActive] =
    useState(false)
  const hideDeleteCommandModal = () => setDeleteCommandModalActive(false)
  const showDeleteCommandModal = () => setDeleteCommandModalActive(true)
  const [commandToDelete, setCommandToDelete] = useState<Command>(
    freshCommand as Command
  )

  const saveCommand = async (command: Partial<Command>) => {
    if (command._id !== "") {
      updateCommandMutation.mutate(command)
    } else {
      createCommandMutation.mutate(command)
    }
    hideEditCommandModal()
  }

  const handleDeleteConfirm = async () => {
    if (commandToDelete._id !== "") {
      deleteCommandMutation.mutate(commandToDelete)
    }
    hideDeleteCommandModal()
  }

  const handleNewCommandClick = () => {
    setCommandToEdit(freshCommand)
    showEditCommandModal()
  }

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
                  setSearchQuery("")
                } else if (e.key == "Enter") {
                  e.currentTarget.blur()
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
          className="mb-3 mx-auto d-block"
          size="lg"
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
          <strong>{searchResults.length}</strong> command
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
                        setCommandToEdit(c)
                        showEditCommandModal()
                      }}
                      className="ms-auto"
                      variant="dark"
                    >
                      <i className="fa-regular fa-pen-to-square"></i>
                    </Button>
                    <Button
                      variant="dark"
                      onClick={() => {
                        setCommandToDelete(c)
                        showDeleteCommandModal()
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
              // Check if this command is being updated optimistically
              const isBeingUpdated =
                updateCommandMutation.isPending &&
                updateCommandMutation.variables?._id === c._id
              const isBeingDeleted =
                deleteCommandMutation.isPending &&
                deleteCommandMutation.variables?._id === c._id

              // Use optimistic data if being updated, otherwise use current data
              const displayCommand = isBeingUpdated
                ? updateCommandMutation.variables
                : c

              // Hide row if being deleted
              if (isBeingDeleted) return null

              return (
                <tr
                  key={`command-${index}`}
                  style={{ opacity: isBeingUpdated ? 0.6 : 1 }}
                >
                  <td className="align-middle text-end">
                    <code className="fs-3">{displayCommand.command}</code>
                    <CommandAliasesStack aliases={displayCommand.aliases} />
                  </td>
                  <td className="align-middle">
                    <div className="lead">
                      <LinkifyText text={displayCommand.response} />
                    </div>
                  </td>
                  {userCanEdit && (
                    <td>
                      <Button
                        variant="dark"
                        disabled={isBeingUpdated || isBeingDeleted}
                        onClick={() => {
                          setCommandToEdit(c)
                          showEditCommandModal()
                        }}
                      >
                        <i className="fa-regular fa-pen-to-square"></i>
                      </Button>
                      <Button
                        variant="dark"
                        disabled={isBeingUpdated || isBeingDeleted}
                        onClick={() => {
                          setCommandToDelete(c)
                          showDeleteCommandModal()
                        }}
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}

            {/* Optimistic new command being created */}
            {createCommandMutation.isPending &&
              createCommandMutation.variables && (
                <tr style={{ opacity: 0.6 }}>
                  <td className="align-middle text-end">
                    <code className="fs-3">
                      {createCommandMutation.variables.command}
                    </code>
                    <CommandAliasesStack
                      aliases={createCommandMutation.variables.aliases}
                    />
                  </td>
                  <td className="align-middle">
                    <div className="lead">
                      <LinkifyText
                        text={createCommandMutation.variables.response}
                      />
                    </div>
                  </td>
                  {userCanEdit && (
                    <td>
                      <Button variant="dark" disabled>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      </Button>
                    </td>
                  )}
                </tr>
              )}
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
        <Modal
          show={deleteCommandModalActive}
          onHide={hideDeleteCommandModal}
          centered={true}
        >
          <Modal.Header closeButton>
            <Modal.Title>Deleting: {commandToDelete.command}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="danger" className="p-3">
              Are you sure you want to delete the{" "}
              <strong>{commandToDelete.command}</strong> command?
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
  )
}

export const CommandAliasesStack = (props: { aliases: string[] }) => {
  const { aliases } = props
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
  )
}

export default CommandsList
