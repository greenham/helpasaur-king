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
import { TwitchUserData } from "../../types/users"

interface ManageStreamAlertsProps {}
const ManageStreamAlerts: React.FunctionComponent<
  ManageStreamAlertsProps
> = () => {
  const toast = useToast()
  const {
    useStreamAlertsChannels,
    useAddChannelToStreamAlerts,
    useRemoveChannelFromStreamAlerts,
  } = useHelpaApi()
  const { data: streamAlertsChannels } = useStreamAlertsChannels()

  const addChannelMutation = useAddChannelToStreamAlerts()
  const removeChannelMutation = useRemoveChannelFromStreamAlerts()

  const [channelToAdd, setChannelToAdd] = React.useState("")
  const handleChannelToAddInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setChannelToAdd(value)
  }
  const handleAddChannelToStreamAlerts = async () => {
    addChannelMutation.mutate(channelToAdd, {
      onSuccess: () => {
        toast.success(`Added ${channelToAdd} to stream alerts!`)
        setChannelToAdd("")
      },
      onError: (error: any) => {
        toast.error(
          `Failed to add ${channelToAdd} to stream alerts: ${error.message}`
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
  const handleRemoveChannelFromStreamAlerts = async () => {
    removeChannelMutation.mutate(channelToRemove, {
      onSuccess: () => {
        toast.success(`Removed channel from stream alerts!`)
        setChannelToRemove("")
      },
      onError: (error: any) => {
        toast.error(
          `Failed to remove channel from stream alerts: ${error.message}`
        )
      },
    })
  }

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
            {addChannelMutation.isPending ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleAddChannelToStreamAlerts}
                size="lg"
                disabled={addChannelMutation.isPending}
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
            {removeChannelMutation.isPending ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleRemoveChannelFromStreamAlerts}
                size="lg"
                disabled={removeChannelMutation.isPending}
              >
                <i className="fa-regular fa-square-minus pe-1"></i> Remove
                Channel
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default ManageStreamAlerts
