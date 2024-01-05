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
  Badge,
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
  const handleAddChannelToStreamAlerts = async () => {
    setChannelAddInProgress(true);
    try {
      const { data: channelAddResult } =
        await addChannelToStreamAlerts(channelToAdd);
      const channelResult = channelAddResult[0].value;
      if (channelResult.status === "success") {
        toast.success(`Added ${channelToAdd} to stream alerts!`);
        setChannelToAdd("");
        queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] });
      } else if (channelResult.status === "error") {
        toast.error(
          `Failed to add ${channelToAdd} to stream alerts: ${channelResult.message}`
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
      const channelResult =
        await removeChannelFromStreamAlerts(channelToRemove);
      if (channelResult.result === "success") {
        toast.success(`Removed ${channelToRemove} from stream alerts!`);
        setChannelToRemove("");
        queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] });
      } else if (channelResult.result === "noop") {
        toast.info(channelResult.message);
      } else if (channelResult.result === "error") {
        toast.error(channelResult.message);
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
      <h4>
        <Badge bg="secondary">
          Watching {streamAlertsChannels?.length} Channels
        </Badge>
      </h4>
      <Container>
        <Row>
          <Col>
            <FloatingLabel
              controlId="channelToAdd"
              label="Twitch username"
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
                onClick={handleAddChannelToStreamAlerts}
                size="lg"
                disabled={channelAddInProgress}
              >
                <i className="fa-regular fa-square-plus pe-1"></i> Add Channel
              </Button>
            )}
          </Col>
        </Row>
      </Container>

      <Container>
        <Row>
          <Col>
            <FloatingLabel
              controlId="channelToRemove"
              label="Choose a channel to remove"
            >
              <Form.Select
                aria-label="Choose a channel to remove"
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
                <i className="fa-regular fa-square-minus pe-1"></i> Remove
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
