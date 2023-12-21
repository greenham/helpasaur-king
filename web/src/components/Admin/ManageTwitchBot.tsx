import * as React from "react";
import { useToast } from "../../hooks/useToast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTwitchBotChannels,
  joinTwitchChannel,
  leaveTwitchChannel,
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

interface ManageTwitchBotProps {}
const ManageTwitchBot: React.FunctionComponent<ManageTwitchBotProps> = () => {
  const toast = useToast();

  const { data: twitchBotChannels } = useQuery({
    queryKey: ["twitchBotChannels"],
    queryFn: getTwitchBotChannels,
  });
  const queryClient = useQueryClient();

  const [channelToJoin, setChannelToJoin] = React.useState("");
  const [channelJoinInProgress, setChannelJoinInProgress] =
    React.useState(false);
  const handleChannelToAddInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setChannelToJoin(value);
  };
  const handleAddChannelToTwitchBot = async () => {
    setChannelJoinInProgress(true);
    try {
      const channelResult = await joinTwitchChannel(channelToJoin);
      console.log(channelResult);
      if (channelResult.result === "success") {
        toast.success(`Twitch bot has joined ${channelToJoin}!`);
        setChannelToJoin("");
        queryClient.invalidateQueries({ queryKey: ["twitchBotChannels"] });
      } else if (channelResult.result === "noop") {
        toast.info(channelResult.message);
        setChannelToJoin("");
      } else if (channelResult.result === "error") {
        toast.error(
          `Twitch bot failed to join ${channelToJoin}: ${channelResult.message}`
        );
      }
    } catch (err) {
      toast.error(`Twitch bot failed to join ${channelToJoin}: ${err}`);
    }
    setChannelJoinInProgress(false);
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
  const handleRemoveChannelFromTwitchBot = async () => {
    setChannelRemoveInProgress(true);
    try {
      const channelResult = await leaveTwitchChannel(channelToRemove);
      if (channelResult.result === "success") {
        toast.success(`Twitch bot has left ${channelToRemove}!`);
        setChannelToRemove("");
        queryClient.invalidateQueries({ queryKey: ["twitchBotChannels"] });
      } else if (channelResult.result === "noop") {
        toast.info(channelResult.message);
      } else if (channelResult.result === "error") {
        toast.error(channelResult.message);
      }
    } catch (err) {
      toast.error(`Twitch bot failed to leave ${channelToRemove}: ${err}`);
    }
    setChannelRemoveInProgress(false);
  };

  return (
    <>
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
                value={channelToJoin}
                onChange={handleChannelToAddInputChange}
                autoComplete="off"
              />
            </FloatingLabel>
          </Col>
          <Col>
            {channelJoinInProgress ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleAddChannelToTwitchBot}
                size="lg"
                disabled={channelJoinInProgress}
              >
                <i className="fa-regular fa-square-plus px-1"></i> Join Channel
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
              label="Choose a channel to leave"
            >
              <Form.Select
                aria-label="Choose a channel to leave"
                value={channelToRemove}
                onChange={handleChannelToRemoveInputChange}
              >
                <option>-</option>
                {twitchBotChannels?.map((channel: string) => (
                  <option key={channel} value={channel}>
                    {channel}
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
                onClick={handleRemoveChannelFromTwitchBot}
                size="lg"
                disabled={channelRemoveInProgress}
              >
                <i className="fa-regular fa-square-minus px-1"></i> Leave
                Channel
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ManageTwitchBot;
