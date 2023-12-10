import * as React from "react";
import { Alert, Button, Container } from "react-bootstrap";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserContext } from "../contexts/user";
import { IUser, UserContextType } from "../types/users";
import {
  getTwitchBotConfig,
  joinTwitchChannel,
  leaveTwitchChannel,
} from "../utils/apiService";
import { useToast } from "../hooks/useToast";
import { getTwitchLoginUrl } from "../utils/utils";

interface TwitchBotPageProps {}

const TwitchBotPage: React.FunctionComponent<TwitchBotPageProps> = () => {
  const toast = useToast();

  useEffect(() => {
    document.title = "Twitch Bot | Helpasaur King";
  }, []);

  const queryClient = useQueryClient();
  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user } = userContext;

  const { data: twitchBotConfig } = useQuery({
    queryKey: ["twitchBotConfig"],
    queryFn: getTwitchBotConfig,
  });

  const handleJoinRequest = async () => {
    const joinResult = await joinTwitchChannel();
    if (joinResult.result) {
      toast.success("Successfully joined your channel!");
      queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] });
    } else {
      toast.warning("Unable to join your channel!");
    }
  };

  const handleLeaveRequest = async () => {
    const leaveResult = await leaveTwitchChannel();
    if (leaveResult.result) {
      toast.success("Successfully left your channel!");
      queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] });
    } else {
      toast.warning("Unable to leave your channel!");
    }
  };

  return (
    <Container id="twitch-bot-page" className="my-5">
      <h1>
        <i className="fa-solid fa-robot"></i> Twitch Bot{" "}
      </h1>
      <hr />
      {!user && (
        <Alert>
          <a href={getTwitchLoginUrl()} rel="noopener,noreferrer">
            Log in with your Twitch account
          </a>{" "}
          to manage the bot right here, or{" "}
          <a
            href="https://twitch.tv/helpasaurking"
            target="_blank"
            rel="noopener,noreferrer"
          >
            go to the bot's Twitch chat
          </a>{" "}
          and send <code>!join</code> or <code>!leave</code>.
        </Alert>
      )}
      {user && (
        <TwitchUserBotManagement
          user={user}
          twitchBotConfig={twitchBotConfig}
          handleJoinRequest={handleJoinRequest}
          handleLeaveRequest={handleLeaveRequest}
        />
      )}
    </Container>
  );
};

interface TwitchUserBotManagementProps {
  user: IUser;
  twitchBotConfig: { botHasJoined: boolean };
  handleJoinRequest: () => void;
  handleLeaveRequest: () => void;
}
const TwitchUserBotManagement: React.FunctionComponent<
  TwitchUserBotManagementProps
> = (props) => {
  const { user, twitchBotConfig, handleJoinRequest, handleLeaveRequest } =
    props;

  if (!twitchBotConfig?.botHasJoined) {
    return (
      <Alert variant="dark" className="p-5">
        <h2>Would you like the bot to join your Twitch chat?</h2>
        <p className="lead my-5">
          Click the button below to have the bot join your Twitch chat. You can
          request it to leave at any time from this page or from the bot's
          Twitch chat.
        </p>
        <Button variant="primary" onClick={handleJoinRequest} size="lg">
          <i className="fa-solid fa-arrow-right-to-bracket px-1"></i> Join my
          channel
        </Button>
      </Alert>
    );
  }

  return (
    <Alert variant="dark" className="p-5">
      <h2>Thanks for using HelpasaurKing!</h2>
      <p className="lead my-5">
        Eventually there will be more settings here like a custom command
        prefix, enable/disable commands, maybe even some Twitch integrations
        with channel points, polls, etc.
      </p>
      <Button variant="danger" onClick={handleLeaveRequest} size="lg">
        <i className="fa-solid fa-right-from-bracket px-1"></i> Leave my channel
      </Button>
    </Alert>
  );
};

export default TwitchBotPage;
