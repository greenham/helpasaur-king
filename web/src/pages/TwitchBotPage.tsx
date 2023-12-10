import * as React from "react";
import { Alert, Button, Container, Modal } from "react-bootstrap";
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
  useEffect(() => {
    document.title = "Twitch Bot | Helpasaur King";
  }, []);

  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user } = userContext;

  const { data: twitchBotConfig } = useQuery({
    queryKey: ["twitchBotConfig"],
    queryFn: getTwitchBotConfig,
  });

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
        />
      )}
    </Container>
  );
};

interface TwitchUserBotManagementProps {
  user: IUser;
  twitchBotConfig: { botHasJoined: boolean };
}
const TwitchUserBotManagement: React.FunctionComponent<
  TwitchUserBotManagementProps
> = (props) => {
  const { user, twitchBotConfig } = props;

  const queryClient = useQueryClient();
  const toast = useToast();

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
    handleCloseLeaveModal();
  };

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

  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const handleShowLeaveModal = () => setShowLeaveModal(true);
  const handleCloseLeaveModal = () => setShowLeaveModal(false);

  return (
    <>
      <Alert variant="dark" className="p-5">
        <h2>Thanks for using HelpasaurKing!</h2>
        <p className="lead my-5">
          Eventually there will be more settings here like a custom command
          prefix, enable/disable commands, maybe even some Twitch integrations
          with channel points, polls, etc.
        </p>
        <Button variant="danger" onClick={handleShowLeaveModal} size="lg">
          <i className="fa-solid fa-right-from-bracket px-1"></i> Leave my
          channel
        </Button>
      </Alert>
      <ConfirmLeaveModal
        show={showLeaveModal}
        handleClose={handleCloseLeaveModal}
        handleConfirm={handleLeaveRequest}
      />
    </>
  );
};

const ConfirmLeaveModal: React.FunctionComponent<{
  show: boolean;
  handleClose: () => void;
  handleConfirm: () => void;
}> = ({ show, handleClose, handleConfirm }) => {
  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Confirm</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want the bot to leave your channel?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="dark" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          Yes, leave my channel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TwitchBotPage;
