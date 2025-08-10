import * as React from "react";
import { Alert, Button, Container, Modal, Spinner, Form, ListGroup, InputGroup } from "react-bootstrap";
import { useEffect, useState } from "react";
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
// Custom toggle component for better UX
interface ConfigToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const ConfigToggle: React.FC<ConfigToggleProps> = ({ id, checked, onChange, disabled, label }) => {
  return (
    <div className="config-toggle clickable-area" onClick={() => !disabled && onChange(!checked)}>
      <Form.Check
        type="switch"
        id={id}
        checked={checked}
        onChange={(e) => e.stopPropagation()} // Prevent double toggle
        disabled={disabled}
        label={
          <span className={checked ? "enabled" : "disabled"}>
            {label || (checked ? "Enabled" : "Disabled")}
          </span>
        }
      />
    </div>
  );
};

// Define allowed prefix characters (excluding / for Discord compatibility)
const ALLOWED_PREFIX_CHARS = "!@#$%^&*()_-=+`~[]{}\\|;:'\",.<>?";

const TwitchUserBotManagement: React.FunctionComponent<
  TwitchUserBotManagementProps
> = (props) => {
  const { user, twitchBotConfig } = props;

  const queryClient = useQueryClient();
  const toast = useToast();
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const handleShowLeaveModal = () => setShowLeaveModal(true);
  const handleCloseLeaveModal = () => setShowLeaveModal(false);
  
  // State for command prefix editing
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [prefixInput, setPrefixInput] = useState(twitchBotConfig?.commandPrefix || "!");
  const [prefixError, setPrefixError] = useState("");

  // Update prefix input when config changes
  useEffect(() => {
    if (twitchBotConfig?.commandPrefix) {
      setPrefixInput(twitchBotConfig.commandPrefix);
    }
  }, [twitchBotConfig?.commandPrefix]);

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

  const validatePrefix = (prefix: string): string => {
    if (!prefix || prefix.length === 0) {
      return "Prefix cannot be empty";
    }
    if (prefix.length > 1) {
      return "Prefix must be exactly one character";
    }
    if (!ALLOWED_PREFIX_CHARS.includes(prefix)) {
      return `Invalid character. Allowed: ${ALLOWED_PREFIX_CHARS}`;
    }
    return "";
  };

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrefix = e.target.value;
    setPrefixInput(newPrefix);
    setPrefixError(validatePrefix(newPrefix));
  };

  const handlePrefixSave = async () => {
    const error = validatePrefix(prefixInput);
    if (error) {
      setPrefixError(error);
      return;
    }

    try {
      await updateConfigMutation.mutateAsync({ commandPrefix: prefixInput });
      toast.success(`Command prefix changed to "${prefixInput}"`);
      setIsEditingPrefix(false);
      setPrefixError("");
    } catch (error: any) {
      toast.error(`Failed to update prefix: ${error?.message || 'Unknown error'}`);
    }
  };

  const handlePrefixCancel = () => {
    setPrefixInput(twitchBotConfig.commandPrefix);
    setPrefixError("");
    setIsEditingPrefix(false);
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

      <h3>Configuration</h3>
      <ListGroup className="mb-4">
        <ListGroup.Item variant="primary">
          <Container className="mt-2 py-4">
            <h4 className="text-info-emphasis"># Command Prefix</h4>
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <p className="mb-2">
                  Set the character that triggers bot commands in your channel.
                </p>
                <p className="text-muted small mb-0">
                  Must be exactly one character. Current prefix: <code>{twitchBotConfig.commandPrefix}</code>
                </p>
              </div>
              <div className="ms-3" style={{ minWidth: "200px" }}>
                {!isEditingPrefix ? (
                  <div className="d-flex align-items-center">
                    <code className="fs-4 me-3">{twitchBotConfig.commandPrefix}</code>
                    <Button
                      variant="outline-info"
                      size="sm"
                      onClick={() => setIsEditingPrefix(true)}
                      disabled={updateConfigMutation.isPending}
                    >
                      <i className="fa-solid fa-edit"></i> Change
                    </Button>
                  </div>
                ) : (
                  <div>
                    <InputGroup size="sm">
                      <Form.Control
                        type="text"
                        value={prefixInput}
                        onChange={handlePrefixChange}
                        maxLength={1}
                        isInvalid={!!prefixError}
                        placeholder="!"
                        style={{ maxWidth: "60px", textAlign: "center", fontFamily: "monospace" }}
                        disabled={updateConfigMutation.isPending}
                      />
                      <Button
                        variant="success"
                        onClick={handlePrefixSave}
                        disabled={!!prefixError || updateConfigMutation.isPending}
                      >
                        <i className="fa-solid fa-check"></i>
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handlePrefixCancel}
                        disabled={updateConfigMutation.isPending}
                      >
                        <i className="fa-solid fa-times"></i>
                      </Button>
                    </InputGroup>
                    {prefixError && (
                      <Form.Text className="text-danger d-block mt-1">
                        {prefixError}
                      </Form.Text>
                    )}
                    <Form.Text className="text-muted d-block mt-1">
                      Allowed: {ALLOWED_PREFIX_CHARS}
                    </Form.Text>
                  </div>
                )}
              </div>
            </div>
          </Container>
        </ListGroup.Item>

        <ListGroup.Item variant="primary">
          <Container className="mt-2 py-4">
            <h4 className="text-info-emphasis"># Commands</h4>
            <div className="d-flex justify-content-between align-items-center">
              <div className="flex-grow-1">
                <p className="mb-2">
                  Enable or disable all bot commands in your channel.
                </p>
                <p className="text-muted small mb-0">
                  When enabled, the bot will respond to commands like <code>{twitchBotConfig.commandPrefix}helpa</code>, <code>{twitchBotConfig.commandPrefix}nmg</code>, etc.
                </p>
              </div>
              <div className="ms-3">
                <ConfigToggle
                  id="commands-switch"
                  checked={twitchBotConfig.commandsEnabled}
                  onChange={(checked) => 
                    handleToggle(
                      "commandsEnabled", 
                      checked,
                      checked ? "Bot commands enabled!" : "Bot commands disabled!"
                    )
                  }
                  disabled={updateConfigMutation.isPending}
                />
              </div>
            </div>
          </Container>
        </ListGroup.Item>

        <ListGroup.Item variant="primary">
          <Container className="mt-2 py-4">
            <h4 className="text-info-emphasis"># Practice Lists</h4>
            <div className="d-flex justify-content-between align-items-center">
              <div className="flex-grow-1">
                <p className="mb-2">
                  Enable practice lists to track and randomize practice items in your channel.
                </p>
                <p className="text-muted small">
                  Commands: <code>{twitchBotConfig.commandPrefix}pracadd</code>, <code>{twitchBotConfig.commandPrefix}pracrand</code>, <code>{twitchBotConfig.commandPrefix}praclist</code>, <code>{twitchBotConfig.commandPrefix}pracdel</code>, <code>{twitchBotConfig.commandPrefix}pracclear</code>
                </p>
              </div>
              <div className="ms-3">
                <ConfigToggle
                  id="practice-lists-switch"
                  checked={twitchBotConfig.practiceListsEnabled}
                  onChange={(checked) => 
                    handleToggle(
                      "practiceListsEnabled", 
                      checked,
                      checked ? "Practice lists enabled!" : "Practice lists disabled!"
                    )
                  }
                  disabled={updateConfigMutation.isPending}
                />
              </div>
            </div>

            {twitchBotConfig.practiceListsEnabled && (
              <div className="mt-4 ps-4 border-start border-3 border-info">
                <h5 className="text-info">&middot; Moderator Access</h5>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="flex-grow-1">
                    <p className="mb-2">
                      Allow moderators to manage practice lists.
                    </p>
                    <p className="text-muted small mb-0">
                      When enabled, moderators can add, remove, and manage practice list entries.
                      When disabled, only you can manage the practice lists.
                    </p>
                  </div>
                  <div className="ms-3">
                    <ConfigToggle
                      id="mod-access-switch"
                      checked={twitchBotConfig.allowModsToManagePracticeLists}
                      onChange={(checked) => 
                        handleToggle(
                          "allowModsToManagePracticeLists", 
                          checked,
                          checked ? "Mods can now manage practice lists!" : "Only you can manage practice lists now!"
                        )
                      }
                      disabled={updateConfigMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            )}
          </Container>
        </ListGroup.Item>
      </ListGroup>

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
