import * as React from "react"
import { useEffect } from "react"
import { Alert, Container, Spinner } from "react-bootstrap"
import CommandsList from "../components/CommandsList"
import { sortCommandsAlpha } from "../utils/utils"
import { useHelpaApi } from "../hooks/useHelpaApi"

interface CommandsPageProps {}

const CommandsPage: React.FunctionComponent<CommandsPageProps> = () => {
  useEffect(() => {
    document.title = "Commands | Helpasaur King"
  }, [])

  const { data: user } = useHelpaApi().useUser()

  const { useCommands, useUpdateCommand, useCreateCommand, useDeleteCommand } =
    useHelpaApi()

  const {
    data: commands,
    isError: commandsError,
    isLoading: commandsLoading,
  } = useCommands()

  const createCommandMutation = useCreateCommand()
  const updateCommandMutation = useUpdateCommand()
  const deleteCommandMutation = useDeleteCommand()

  if (commandsError) {
    return <Alert variant="danger">{commandsError}</Alert>
  }

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
      <hr />

      {commandsLoading && (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      )}

      {!commandsError && !commandsLoading && (
        <CommandsList
          commands={sortCommandsAlpha(commands)}
          userCanEdit={user ? user.permissions.includes("admin") : false}
          createCommandMutation={createCommandMutation}
          updateCommandMutation={updateCommandMutation}
          deleteCommandMutation={deleteCommandMutation}
        />
      )}
    </Container>
  )
}

export default CommandsPage
