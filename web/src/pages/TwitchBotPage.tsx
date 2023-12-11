import * as React from "react";
import { Alert, Button, Container, Modal, Spinner } from "react-bootstrap";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IUser } from "../types/users";
import {
  getTwitchBotConfig,
  joinTwitchChannel,
  leaveTwitchChannel,
} from "../utils/apiService";
import { useToast } from "../hooks/useToast";
import { getTwitchLoginUrl } from "../utils/utils";
import { useUser } from "../hooks/useUser";

interface TwitchBotPageProps {}

const TwitchBotPage: React.FunctionComponent<TwitchBotPageProps> = () => {
  useEffect(() => {
    document.title = "Twitch Bot | Helpasaur King";
  }, []);

  const { data: user, isPending: userLoading } = useUser();

  const { data: twitchBotConfig, isPending: twitchBotConfigLoading } = useQuery(
    {
      queryKey: ["twitchBotConfig"],
      queryFn: getTwitchBotConfig,
      retry: 0,
    }
  );

  if (userLoading || twitchBotConfigLoading)
    return (
      <Container>
        <Spinner animation="border" role="statues">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );

  return (
    <Container id="twitch-bot-page" className="my-5">
      <h1>
        <i className="fa-solid fa-robot"></i> Twitch Bot{" "}
      </h1>
      <hr />
      {!user && (
        <Alert>
          <Alert.Link href={getTwitchLoginUrl()} rel="noopener,noreferrer">
            Log in with your Twitch account
          </Alert.Link>{" "}
          to manage the bot right here, or{" "}
          <Alert.Link
            href="https://twitch.tv/helpasaurking"
            target="_blank"
            rel="noopener,noreferrer"
          >
            go to the bot's Twitch chat
          </Alert.Link>{" "}
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
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const handleShowLeaveModal = () => setShowLeaveModal(true);
  const handleCloseLeaveModal = () => setShowLeaveModal(false);

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

  return (
    <>
      <Alert variant="dark" className="p-5">
        <h2>
          Hey, <strong>{user.twitchUserData.display_name}</strong>!
        </h2>
        <h4 className="text-muted">
          ✅ HelpasaurKing is currently helping in your channel.
        </h4>
        <hr />
        <p className="lead mb-5">
          Eventually there will be more features here like an easy toggle for
          turning responses on/off (globally or per-command), custom command
          prefixes, practice lists, maybe even some Twitch integrations with
          channel points, polls, etc.
          <br />
          <br />
          For now, you can only tell the bot to leave (or re-join) your channel
          at any time.
        </p>
        <Button variant="secondary" onClick={handleShowLeaveModal} size="lg">
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
        <Modal.Title>Confirm Request</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="dark" className="p-3">
          Are you sure you want the bot to leave your channel? You can have it
          re-join at any time.
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="dark" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleConfirm}>
          <i className="fa-solid fa-right-from-bracket px-1"></i> Yes, leave my
          channel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TwitchBotPage;
