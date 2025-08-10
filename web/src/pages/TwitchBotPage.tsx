import * as React from "react";
import { Alert, Button, Container, Modal, Spinner, Form, Card, Row, Col } from "react-bootstrap";
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { IUser } from "../types/users";
import {
  getTwitchBotConfig,
  joinTwitchChannel,
  leaveTwitchChannel,
  updateTwitchBotConfig,
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

interface TwitchBotConfig {
  active: boolean;
  commandsEnabled: boolean;
  commandPrefix: string;
  textCommandCooldown: number;
  practiceListsEnabled: boolean;
  allowModsToManagePracticeLists: boolean;
  weeklyRaceAlertEnabled: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

interface TwitchUserBotManagementProps {
  user: IUser;
  twitchBotConfig: TwitchBotConfig;
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
    if (joinResult.result === "success") {
      toast.success("Successfully joined your channel!");
      queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] });
    } else {
      toast.warning("Unable to join your channel!");
    }
  };

  const handleLeaveRequest = async () => {
    const leaveResult = await leaveTwitchChannel();
    if (leaveResult.result === "success") {
      toast.success("Successfully left your channel!");
      queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] });
    } else {
      toast.warning("Unable to leave your channel!");
    }
    handleCloseLeaveModal();
  };

  if (!twitchBotConfig?.active) {
    return (
      <Alert variant="dark" className="p-5">
        <h2>Would you like HelpasaurKing to help your Twitch chat?</h2>
        <p className="lead my-5">
          Click the button below to have the bot join your Twitch chat. You can
          request it to leave at any time from this page or from the bot's
          Twitch chat.
        </p>
        <Button variant="primary" onClick={handleJoinRequest} size="lg">
          <i className="fa-solid fa-arrow-right-to-bracket pe-1"></i> Join my
          channel
        </Button>
      </Alert>
    );
  }

  const updateConfigMutation = useMutation({
    mutationFn: updateTwitchBotConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twitchBotConfig"] });
    },
  });

  const handleToggle = async (field: string, value: boolean, successMessage: string) => {
    try {
      await updateConfigMutation.mutateAsync({ [field]: value });
      toast.success(successMessage);
    } catch (error: any) {
      toast.error(`Failed to update configuration: ${error?.message || 'Unknown error'}`);
    }
  };

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
        <Button variant="secondary" onClick={handleShowLeaveModal} size="lg">
          <i className="fa-solid fa-right-from-bracket pe-1"></i> Leave my
          channel
        </Button>
      </Alert>

      <Card className="mb-4">
        <Card.Header>
          <h4><i className="fa-solid fa-cog"></i> Bot Configuration</h4>
        </Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={8}>
              <h5>Practice Lists</h5>
              <p className="text-muted">
                Enable practice lists to track and randomize practice items in your channel.
                Commands: !pracadd, !pracrand, !praclist, !pracdel, !pracclear
              </p>
            </Col>
            <Col md={4} className="d-flex align-items-center justify-content-end">
              <Form.Check
                type="switch"
                id="practice-lists-switch"
                label={twitchBotConfig.practiceListsEnabled ? "Enabled" : "Disabled"}
                checked={twitchBotConfig.practiceListsEnabled}
                onChange={(e) => 
                  handleToggle(
                    "practiceListsEnabled", 
                    e.target.checked,
                    e.target.checked ? "Practice lists enabled!" : "Practice lists disabled!"
                  )
                }
                disabled={updateConfigMutation.isPending}
              />
            </Col>
          </Row>

          {twitchBotConfig.practiceListsEnabled && (
            <Row className="mb-3 ms-3">
              <Col md={8}>
                <h6>Allow Mods to Manage Practice Lists</h6>
                <p className="text-muted">
                  When enabled, moderators can add, remove, and manage practice list entries.
                  When disabled, only you can manage the practice lists.
                </p>
              </Col>
              <Col md={4} className="d-flex align-items-center justify-content-end">
                <Form.Check
                  type="switch"
                  id="mod-access-switch"
                  label={twitchBotConfig.allowModsToManagePracticeLists ? "Enabled" : "Disabled"}
                  checked={twitchBotConfig.allowModsToManagePracticeLists}
                  onChange={(e) => 
                    handleToggle(
                      "allowModsToManagePracticeLists", 
                      e.target.checked,
                      e.target.checked ? "Mods can now manage practice lists!" : "Only you can manage practice lists now!"
                    )
                  }
                  disabled={updateConfigMutation.isPending}
                />
              </Col>
            </Row>
          )}

          <hr />

          <Row className="mb-3">
            <Col md={8}>
              <h5>Commands</h5>
              <p className="text-muted">
                Enable or disable all bot commands in your channel.
              </p>
            </Col>
            <Col md={4} className="d-flex align-items-center justify-content-end">
              <Form.Check
                type="switch"
                id="commands-switch"
                label={twitchBotConfig.commandsEnabled ? "Enabled" : "Disabled"}
                checked={twitchBotConfig.commandsEnabled}
                onChange={(e) => 
                  handleToggle(
                    "commandsEnabled", 
                    e.target.checked,
                    e.target.checked ? "Bot commands enabled!" : "Bot commands disabled!"
                  )
                }
                disabled={updateConfigMutation.isPending}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={8}>
              <h5>Weekly Race Alerts</h5>
              <p className="text-muted">
                Get notified in chat when the weekly ALttP race is about to start.
              </p>
            </Col>
            <Col md={4} className="d-flex align-items-center justify-content-end">
              <Form.Check
                type="switch"
                id="race-alerts-switch"
                label={twitchBotConfig.weeklyRaceAlertEnabled ? "Enabled" : "Disabled"}
                checked={twitchBotConfig.weeklyRaceAlertEnabled}
                onChange={(e) => 
                  handleToggle(
                    "weeklyRaceAlertEnabled", 
                    e.target.checked,
                    e.target.checked ? "Weekly race alerts enabled!" : "Weekly race alerts disabled!"
                  )
                }
                disabled={updateConfigMutation.isPending}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

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
