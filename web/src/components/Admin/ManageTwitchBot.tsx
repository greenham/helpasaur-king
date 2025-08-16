import * as React from "react"
import { useToast } from "../../hooks/useToast"
import { useHelpaApi } from "../../hooks/useHelpaApi"
import {
  Container,
  Row,
  Col,
  FloatingLabel,
  Form,
  Spinner,
  Button,
  Badge,
} from "react-bootstrap"

interface ManageTwitchBotProps {}
const ManageTwitchBot: React.FunctionComponent<ManageTwitchBotProps> = () => {
  const toast = useToast()

  const { useTwitchBotChannels, useJoinTwitchChannel, useLeaveTwitchChannel } =
    useHelpaApi()
  const { data: twitchBotChannels } = useTwitchBotChannels()

  const joinChannelMutation = useJoinTwitchChannel()
  const leaveChannelMutation = useLeaveTwitchChannel()

  const [channelToJoin, setChannelToJoin] = React.useState("")
  const handleChannelToAddInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setChannelToJoin(value)
  }
  const handleAddChannelToTwitchBot = async () => {
    joinChannelMutation.mutate(channelToJoin, {
      onSuccess: () => {
        toast.success(`Twitch bot has joined ${channelToJoin}!`)
        setChannelToJoin("")
      },
      onError: (error: any) => {
        toast.error(
          `Twitch bot failed to join ${channelToJoin}: ${error.message}`
        )
      },
    })
  }

  const [channelToRemove, setChannelToRemove] = React.useState("")
  const handleChannelToRemoveInputChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value
    setChannelToRemove(value)
  }
  const handleRemoveChannelFromTwitchBot = async () => {
    leaveChannelMutation.mutate(channelToRemove, {
      onSuccess: () => {
        toast.success(`Twitch bot has left ${channelToRemove}!`)
        setChannelToRemove("")
      },
      onError: (error: any) => {
        toast.error(
          `Twitch bot failed to leave ${channelToRemove}: ${error.message}`
        )
      },
    })
  }

  return (
    <>
      <h4>
        <Badge bg="secondary">In {twitchBotChannels?.length} Channels</Badge>
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
                value={channelToJoin}
                onChange={handleChannelToAddInputChange}
                autoComplete="off"
              />
            </FloatingLabel>
          </Col>
          <Col>
            {joinChannelMutation.isPending ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleAddChannelToTwitchBot}
                size="lg"
                disabled={joinChannelMutation.isPending}
              >
                <i className="fa-regular fa-square-plus pe-1"></i> Join Channel
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
            {leaveChannelMutation.isPending ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleRemoveChannelFromTwitchBot}
                size="lg"
                disabled={leaveChannelMutation.isPending}
              >
                <i className="fa-regular fa-square-minus pe-1"></i> Leave
                Channel
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default ManageTwitchBot
