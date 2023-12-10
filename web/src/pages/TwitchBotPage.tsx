import * as React from "react";
// import { useEffect } from "react";
// import { Button, Container } from "react-bootstrap";
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { UserContext } from "../contexts/user";
// import { IUser, UserContextType } from "../types/users";
// import {
//   getTwitchBotConfig,
//   joinTwitchChannel,
//   leaveTwitchChannel,
// } from "../utils/apiService";
// import { useToast } from "../hooks/useToast";

import { Button, Container } from "react-bootstrap";
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

interface TwitchBotPageProps {}

const TwitchBotPage: React.FunctionComponent<TwitchBotPageProps> = () => {
  useEffect(() => {
    document.title = "Twitch Bot | Helpasaur King";
  }, []);

  const queryClient = useQueryClient();
  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user } = userContext;

  const toast = useToast();

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
      toast.error("Unable to join your channel!");
    }
  };

  const handleLeaveRequest = async () => {
    const leaveResult = await leaveTwitchChannel();
    if (leaveResult.result) {
      toast.success("Successfully left your channel!");
      queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] });
    } else {
      toast.error("Unable to leave your channel!");
    }
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
      <>
        <h2>
          Hello, {user.twitchUserData.display_name}!<br />
          Would you like the bot to join your Twitch chat?
        </h2>
        <Button variant="primary" onClick={handleJoinRequest}>
          <i className="fa-solid fa-arrow-right-to-bracket px-1"></i> Join my
          channel
        </Button>
      </>
    );
  }

  return (
    <>
      <h2>
        Hello, {user.twitchUserData.display_name}!<br />
        Thanks for using HelpasaurKing.
      </h2>
      <Button variant="danger" onClick={handleLeaveRequest}>
        <i className="fa-solid fa-right-from-bracket px-1"></i> Leave my channel
      </Button>
    </>
  );
};

export default TwitchBotPage;
