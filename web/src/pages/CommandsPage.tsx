import * as React from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Container, Spinner } from "react-bootstrap";
import { getCommands } from "../utils/apiService";
import { UserContext } from "../contexts/user";
import { UserContextType } from "../types/users";
import CommandsList from "../components/CommandsList";
import { sortCommandsAlpha } from "../utils/utils";

interface CommandsPageProps {}

const CommandsPage: React.FunctionComponent<CommandsPageProps> = () => {
  useEffect(() => {
    document.title = "Commands | Helpasaur King";
  }, []);

  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user } = userContext;

  const query = useQuery({ queryKey: ["commands"], queryFn: getCommands });
  const {
    data: commands,
    isError: commandsError,
    isLoading: commandsLoading,
  } = query;

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
        />
      )}
    </Container>
  );
};

export default CommandsPage;
