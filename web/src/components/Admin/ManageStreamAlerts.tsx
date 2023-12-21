import * as React from "react";
import { useToast } from "../../hooks/useToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addChannelToStreamAlerts,
  getStreamAlertsChannels,
  removeChannelFromStreamAlerts,
} from "../../utils/apiService";
import {
  Container,
  Row,
  Col,
  FloatingLabel,
  Form,
  Spinner,
  Button,
} from "react-bootstrap";
import { TwitchUserData } from "../../types/users";

interface ManageStreamAlertsProps {}
const ManageStreamAlerts: React.FunctionComponent<
  ManageStreamAlertsProps
> = () => {
  const toast = useToast();

  const { data: streamAlertsChannels } = useQuery({
    queryKey: ["streamAlertsChannels"],
    queryFn: getStreamAlertsChannels,
  });
  const queryClient = useQueryClient();

  const [channelToAdd, setChannelToAdd] = React.useState("");
  const [channelAddInProgress, setChannelAddInProgress] = React.useState(false);
  const handleChannelToAddInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setChannelToAdd(value);
  };
  const handleAddUserToStreamAlerts = async () => {
    setChannelAddInProgress(true);
    try {
      const { data: userAddResult } =
        await addChannelToStreamAlerts(channelToAdd);
      const userResult = userAddResult[0].value;
      if (userResult.status === "success") {
        toast.success(`Added ${channelToAdd} to stream alerts!`);
        setChannelToAdd("");
        queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] });
      } else if (userResult.status === "error") {
        toast.error(
          `Failed to add ${channelToAdd} to stream alerts: ${userResult.message}`
        );
      }
    } catch (err) {
      toast.error(`Failed to add ${channelToAdd} to stream alerts: ${err}`);
    }
    setChannelAddInProgress(false);
  };

  const [channelToRemove, setChannelToRemove] = React.useState("");
  const [channelRemoveInProgress, setChannelRemoveInProgress] =
    React.useState(false);
  const handleChannelToRemoveInputChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setChannelToRemove(value);
  };
  const handleRemoveChannelFromStreamAlerts = async () => {
    setChannelRemoveInProgress(true);
    try {
      const userResult = await removeChannelFromStreamAlerts(channelToRemove);
      if (userResult.result === "success") {
        toast.success(`Removed ${channelToRemove} from stream alerts!`);
        setChannelToRemove("");
        queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] });
      } else if (userResult.result === "noop") {
        toast.info(userResult.message);
      } else if (userResult.result === "error") {
        toast.error(userResult.message);
      }
    } catch (err) {
      toast.error(
        `Failed to remove ${channelToRemove} from stream alerts: ${err}`
      );
    }
    setChannelRemoveInProgress(false);
  };

  return (
    <>
      <Container>
        <h2>Add User to Stream Alerts</h2>
        <Row>
          <Col>
            <FloatingLabel
              controlId="channelToAdd"
              label="Twitch channel"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="pokimane"
                name="channelToAdd"
                value={channelToAdd}
                onChange={handleChannelToAddInputChange}
                autoComplete="off"
              />
            </FloatingLabel>
          </Col>
          <Col>
            {channelAddInProgress ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleAddUserToStreamAlerts}
                size="lg"
                disabled={channelAddInProgress}
              >
                <i className="fa-regular fa-square-plus px-1"></i> Add Channel
              </Button>
            )}
          </Col>
        </Row>
      </Container>

      <Container>
        <h2>Remove User from Stream Alerts</h2>
        <Row>
          <Col>
            <FloatingLabel
              controlId="userToRemove"
              label="Choose a user to remove"
            >
              <Form.Select
                aria-label="Choose a user to remove"
                value={channelToRemove}
                onChange={handleChannelToRemoveInputChange}
              >
                <option>-</option>
                {streamAlertsChannels?.map((channel: TwitchUserData) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.display_name}
                  </option>
                ))}
              </Form.Select>
            </FloatingLabel>
          </Col>
          <Col>
            {channelRemoveInProgress ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleRemoveChannelFromStreamAlerts}
                size="lg"
                disabled={channelRemoveInProgress}
              >
                <i className="fa-regular fa-square-minus px-1"></i> Remove
                Channel
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ManageStreamAlerts;
