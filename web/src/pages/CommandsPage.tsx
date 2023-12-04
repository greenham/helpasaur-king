import * as React from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Container, Spinner } from "react-bootstrap";
import { getCommands } from "../utils/apiService";
import { UserContext } from "../contexts/user";
import { UserContextType } from "../types/users";
import CommandsList from "../components/CommandsList";
import { sortCommandsAlpha } from "../utils/utils";
import { createCommand, updateCommand } from "../utils/apiService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Command } from "../types/commands";

interface CommandsPageProps {}

const CommandsPage: React.FunctionComponent<CommandsPageProps> = () => {
  useEffect(() => {
    document.title = "Commands | Helpasaur King";
  }, []);

  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user } = userContext;

  const commandsQuery = useQuery({
    queryKey: ["commands"],
    queryFn: getCommands,
  });
  const {
    data: commands,
    isError: commandsError,
    isLoading: commandsLoading,
  } = commandsQuery;

  const queryClient = useQueryClient();
  const handleUpdateCommand = (command: Command) => {
    updateCommandMutation.mutate(command);
  };

  // Mutations
  const updateCommandMutation = useMutation({
    mutationFn: updateCommand,
    // When mutate is called:
    onMutate: async (updatedCommand) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["commands"] });

      // Snapshot the previous value
      const previousCommands = queryClient.getQueryData(["commands"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["commands"], (old: Command[]) =>
        old.map((c) => (c._id !== updatedCommand._id ? c : updatedCommand))
      );

      // Return a context object with the snapshotted value
      return { previousCommands: previousCommands };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        ["commands"],
        context ? context.previousCommands : []
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] });
    },
  });

  if (commandsError) {
    return <Alert variant="danger">{commandsError}</Alert>;
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
        />
      )}
    </Container>
  );
};

export default CommandsPage;
