import * as React from "react";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import LinkifyText from "./LinkifyText";
import Badge from "react-bootstrap/Badge";
import Stack from "react-bootstrap/Stack";

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

interface CommandsListProps {}
interface Command {
  _id: string;
  command: string;
  aliases: Array<string>;
  response: string;
  category: string;
  enabled: boolean;
}

const CommandsList: React.FunctionComponent<CommandsListProps> = () => {
  const [commands, setCommands] = React.useState<Array<Command>>([]);
  React.useEffect(() => {
    fetch(`${API_URL}/commands`, {
      headers: { Authorization: String(API_KEY) },
    })
      .then((rawResponse) => rawResponse.json())
      .then((commands: Array<Command>) => {
        commands.sort((a, b) => {
          if (a.command < b.command) {
            return -1;
          }
          if (a.command > b.command) {
            return 1;
          }
          return 0;
        });
        setCommands(commands);
      });
  }, []);
  return (
    <Container id="commands" className="mt-5">
      <h1>Commands</h1>
      <p>
        Each of these commands will work via the Discord or Twitch bots,
        preceded by their configured prefix, which is <code>!</code> by default.
        e.g. <code>!nmg</code>
      </p>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Command</th>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          {commands.map((c, index) => {
            return (
              <tr key={`command-${index}`}>
                <td>
                  <p>
                    <code>{c.command}</code>
                  </p>
                  <Stack direction="horizontal" gap={1}>
                    {c.aliases.map((a) => (
                      <Badge bg="secondary">{a}</Badge>
                    ))}
                  </Stack>
                </td>
                <td>
                  <LinkifyText text={c.response} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Container>
  );
};

export default CommandsList;
