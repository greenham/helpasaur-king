import * as React from "react"
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Alert, Container, Spinner } from "react-bootstrap"
import CommandsList from "../components/CommandsList"
import { sortCommandsAlpha } from "../utils/utils"
import {
  getCommands,
  createCommand,
  updateCommand,
  deleteCommand,
} from "../utils/apiService"
import { Command } from "../types/commands"
import { useUser } from "../hooks/useUser"
import { useToast } from "../hooks/useToast"

interface CommandsPageProps {}

const CommandsPage: React.FunctionComponent<CommandsPageProps> = () => {
  useEffect(() => {
    document.title = "Commands | Helpasaur King"
  }, [])

  const { data: user } = useUser()
  const toast = useToast()

  const commandsQuery = useQuery({
    queryKey: ["commands"],
    queryFn: getCommands,
  })
  const {
    data: commands,
    isError: commandsError,
    isLoading: commandsLoading,
  } = commandsQuery

  const queryClient = useQueryClient()
  const handleUpdateCommand = (command: Command) => {
    updateCommandMutation.mutate(command)
  }
  const handleCreateCommand = (command: Command) => {
    createCommandMutation.mutate(command)
  }
  const handleDeleteCommand = (command: Command) => {
    deleteCommandMutation.mutate(command)
  }

  // Mutations
  // @TODO: DRY this out
  const updateCommandMutation = useMutation({
    mutationFn: updateCommand,
    // When mutate is called:
    onMutate: async (updatedCommand) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["commands"] })

      // Snapshot the previous value
      const previousCommands = queryClient.getQueryData(["commands"])

      // Optimistically update to the new value
      queryClient.setQueryData(["commands"], (old: Command[]) =>
        old.map((c) => (c._id !== updatedCommand._id ? c : updatedCommand))
      )

      // Return a context object with the snapshotted value
      return { previousCommands: previousCommands }
    },
    onSuccess(data, variables, context) {
      toast.success(`Command '${variables.command}' updated!`)
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, updatedCommand, context) => {
      queryClient.setQueryData(
        ["commands"],
        context ? context.previousCommands : []
      )
      toast.error(`Unable to update command: ${err.message}`)
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] })
    },
  })

  const createCommandMutation = useMutation({
    mutationFn: createCommand,
    // When mutate is called:
    onMutate: async (newCommand) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["commands"] })

      // Snapshot the previous value
      const previousCommands = queryClient.getQueryData(["commands"])

      // Optimistically update to the new value
      queryClient.setQueryData(["commands"], (old: Command[]) => [
        ...old,
        newCommand,
      ])

      // Return a context object with the snapshotted value
      return { previousCommands: previousCommands }
    },
    onSuccess(data, variables, context) {
      toast.success(`Command '${variables.command}' created!`)
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, newCommand, context) => {
      queryClient.setQueryData(
        ["commands"],
        context ? context.previousCommands : []
      )
      toast.error(`Unable to create command: ${err.message}`)
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] })
    },
  })

  const deleteCommandMutation = useMutation({
    mutationFn: deleteCommand,
    // When mutate is called:
    onMutate: async (deletedCommand) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["commands"] })

      // Snapshot the previous value
      const previousCommands = queryClient.getQueryData(["commands"])

      // Optimistically update to the new value
      queryClient.setQueryData(["commands"], (old: Command[]) =>
        old.filter((c) => c._id !== deletedCommand._id)
      )

      // Return a context object with the snapshotted value
      return { previousCommands: previousCommands }
    },
    onSuccess(data, variables, context) {
      toast.success(`Command '${variables.command}' deleted!`)
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, deletedCommand, context) => {
      queryClient.setQueryData(
        ["commands"],
        context ? context.previousCommands : []
      )
      toast.error(`Unable to delete command: ${err.message}`)
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] })
    },
  })

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
          updateCommand={handleUpdateCommand}
          createCommand={handleCreateCommand}
          deleteCommand={handleDeleteCommand}
        />
      )}
    </Container>
  )
}

export default CommandsPage
