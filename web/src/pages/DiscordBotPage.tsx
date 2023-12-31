import * as React from "react";
import { Alert, Button, Container } from "react-bootstrap";
import { useEffect } from "react";

interface DiscordBotPageProps {}

const DiscordBotPage: React.FunctionComponent<DiscordBotPageProps> = () => {
  useEffect(() => {
    document.title = "Discord Bot | Helpasaur King";
  }, []);

  return (
    <Container id="discord-bot-page" className="my-5">
      <h1>
        <i className="fa-brands fa-discord"></i> Discord Bot{" "}
      </h1>
      <hr />
      <Alert variant="dark" className="p-5">
        <h2>Would you like the bot to join your Discord server?</h2>
        <Button
          variant="primary"
          href="https://discord.com/api/oauth2/authorize?client_id=1015622937300181123&permissions=17978733153344&scope=bot"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
        >
          <i className="fa-regular fa-square-plus pe-1"></i> Add to your server
        </Button>
      </Alert>
      <h2>Command List</h2>
    </Container>
  );
};

export default DiscordBotPage;
