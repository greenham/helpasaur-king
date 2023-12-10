import * as React from "react";
import { useEffect } from "react";
import { Button, Container } from "react-bootstrap";
import { UserContext } from "../contexts/user";
import { IUser, UserContextType } from "../types/users";
import {
  getTwitchBotConfig,
  joinTwitchChannel,
  leaveTwitchChannel,
} from "../utils/apiService";
import { useQuery } from "@tanstack/react-query";

interface TwitchBotPageProps {}

const TwitchBotPage: React.FunctionComponent<TwitchBotPageProps> = () => {
  useEffect(() => {
    document.title = "Twitch Bot | Helpasaur King";
  }, []);

  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user } = userContext;

  const {
    data: twitchBotConfig,
    isLoading: twitchBotConfigLoading,
    isError: twitchBotConfigError,
  } = useQuery({
    queryKey: ["twitchBotConfig"],
    queryFn: getTwitchBotConfig,
  });

  const handleJoinRequest = () => {
    joinTwitchChannel();
  };

  const handleLeaveRequest = () => {
    leaveTwitchChannel();
  };

  return (
    <Container id="twitch-bot-page" className="my-5">
      <h1>
        <i className="fa-solid fa-robot"></i> Twitch Bot{" "}
      </h1>
      <hr />
      {!user && <span>You're not logged in!</span>}
      {user && (
        <TwitchUserBotManagement
          user={user}
          botHasJoined={twitchBotConfig.botHasJoined}
          handleJoinRequest={handleJoinRequest}
          handleLeaveRequest={handleLeaveRequest}
        />
      )}
    </Container>
  );
};

interface TwitchUserBotManagementProps {
  user: IUser;
  botHasJoined: boolean;
  handleJoinRequest: () => void;
  handleLeaveRequest: () => void;
}
const TwitchUserBotManagement: React.FunctionComponent<
  TwitchUserBotManagementProps
> = (props) => {
  const { user, botHasJoined, handleJoinRequest, handleLeaveRequest } = props;
  if (!botHasJoined) {
    return (
      <>
        <h2>Would you like the bot to join your Twitch chat?</h2>
        <Button variant="primary" onClick={handleJoinRequest}>
          Join my channel
        </Button>
      </>
    );
  }

  return (
    <>
      <h2>
        Hello, {user.twitchUserData.display_name}! Thanks for using
        HelpasaurKing.
      </h2>
      <Button variant="danger" onClick={handleLeaveRequest}>
        Leave my channel
      </Button>
    </>
  );
};

export default TwitchBotPage;
