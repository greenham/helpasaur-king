import * as React from "react"
import { useCallback, useEffect, useState } from "react"
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
import { Command } from "@helpasaur/types"
import CommandFormModal from "./CommandFormModal"
import { useHelpaApi } from "../hooks/useHelpaApi"
import TagFilter from "./TagFilter"
import AlphabetFilter from "./AlphabetFilter"

interface CommandsListProps {
  commands: Command[]
  userCanEdit: boolean
  createCommandMutation: UseMutationResult<
    void,
    Error,
    Partial<Command>,
    unknown
  >
  updateCommandMutation: UseMutationResult<
    void,
    Error,
    Partial<Command> & { _id: string },
    unknown
  >
  deleteCommandMutation: UseMutationResult<void, Error, Command, unknown>
}

const CommandsList: React.FunctionComponent<CommandsListProps> = (props) => {
  const {
    commands,
    userCanEdit,
    createCommandMutation,
    updateCommandMutation,
    deleteCommandMutation,
  } = props

  // Set up searching and filtering
  const { hash } = useLocation()
  const [searchQuery, setSearchQuery] = useState(hash.replace("#", ""))
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500)
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [selectedLetter, setSelectedLetter] = useState<string>("all")
  const [filteredResults, setFilteredResults] = useState<Array<Command>>([])

  // Get tags for filtering
  const { data: tagStats = [] } = useHelpaApi().useTagStats()

  const filterCommands = useCallback(
    (
      commandsToFilter: Command[],
      query: string,
      tag: string,
      letter: string
    ) => {
      let filtered = commandsToFilter

      // Apply text search filter
      if (query.length > 0) {
        filtered = filtered.filter(
          (c) =>
            c.command.toLowerCase().includes(query.toLowerCase()) ||
            c.aliases.some((alias) =>
              alias.toLowerCase().includes(query.toLowerCase())
            ) ||
            c.response.toLowerCase().includes(query.toLowerCase()) ||
            (c.tags &&
              c.tags.some((tag) =>
                tag.toLowerCase().includes(query.toLowerCase())
              ))
        )
      }

      // Apply tag filter (single tag selection)
      if (tag !== "all") {
        filtered = filtered.filter((c) => c.tags && c.tags.includes(tag))
      }

      // Apply alphabetical filter
      if (letter !== "all") {
        if (letter === "0-9") {
          // Filter for commands starting with numbers
          filtered = filtered.filter((c) => /^[0-9]/.test(c.command))
        } else {
          // Filter for commands starting with a specific letter
          filtered = filtered.filter((c) =>
            c.command.toLowerCase().startsWith(letter.toLowerCase())
          )
        }
      }

      return filtered
    },
    [] // No dependencies, function logic doesn't depend on any external values
  )

  // Handle updates to the location hash
  useEffect(() => {
    setSearchQuery(hash.replace("#", ""))
  }, [hash])

  useEffect(() => {
    const filtered = filterCommands(
      commands,
      debouncedSearchQuery,
      selectedTag,
      selectedLetter
    )
    setFilteredResults(filtered)

    // Update URL with search query (preserve existing behavior)
    if (debouncedSearchQuery) {
      window.location.replace(`#${debouncedSearchQuery}`)
    }
  }, [debouncedSearchQuery, commands, selectedTag, selectedLetter])

  // Get count for each letter or number (for alpha index)
  const getLetterCount = (letter: string) => {
    // Check if it's a single digit number
    if (/^[0-9]$/.test(letter)) {
      return commands.filter((c) => c.command.startsWith(letter)).length
    }
    // For letters, use case-insensitive matching
    return commands.filter((c) =>
      c.command.toLowerCase().startsWith(letter.toLowerCase())
    ).length
  }

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
      updateCommandMutation.mutate(
        command as Partial<Command> & { _id: string }
      )
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
      {/* Tag Filter - only show if there are tags */}
      <TagFilter
        tagStats={tagStats}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        totalCommands={commands.length}
      />

      {/* Search Input */}
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
                } else if (e.key === "Enter") {
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

      {/* Alpha Index */}
      <AlphabetFilter
        selectedLetter={selectedLetter}
        onLetterChange={setSelectedLetter}
        getLetterCount={getLetterCount}
      />

      {filteredResults.length === 0 && (
        <Alert>
          No results found
          {searchQuery.length > 0 && (
            <span>
              &nbsp; for <strong>{searchQuery}</strong>
            </span>
          )}
          {selectedTag !== "all" && (
            <span>
              &nbsp; tagged with <strong>{selectedTag}</strong>
            </span>
          )}
          {selectedLetter !== "all" && (
            <span>
              &nbsp; starting with <strong>{selectedLetter}</strong>
            </span>
          )}
          .
        </Alert>
      )}

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

      {filteredResults.length > 0 && (
        <Alert variant="dark">
          <strong>{filteredResults.length}</strong> command
          {filteredResults.length !== 1 ? "s" : ""} found.
        </Alert>
      )}

      <Stack gap={5} className="d-xl-none">
        {filteredResults.map((c, idx) => (
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

      {filteredResults.length > 0 && (
        <Table striped bordered hover className="d-none d-xl-block">
          <thead>
            <tr>
              <th className="text-end w-25">Command</th>
              <th className="w-75">Response</th>
              {userCanEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((c, index) => {
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
                    <CommandAliasesStack
                      aliases={displayCommand.aliases || []}
                    />
                  </td>
                  <td className="align-middle">
                    <div className="lead">
                      <LinkifyText text={displayCommand.response || ""} />
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
                      aliases={createCommandMutation.variables.aliases || []}
                    />
                  </td>
                  <td className="align-middle">
                    <div className="lead">
                      <LinkifyText
                        text={createCommandMutation.variables.response || ""}
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
