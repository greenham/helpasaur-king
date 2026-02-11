import * as React from "react"
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
import { StreamAlertsChannel, EventSubSubscription } from "@helpasaur/types"

interface ManageStreamAlertsProps {}
const ManageStreamAlerts: React.FunctionComponent<
  ManageStreamAlertsProps
> = () => {
  const {
    useStreamAlertsChannels,
    useAddChannelToStreamAlerts,
    useRemoveChannelFromStreamAlerts,
    useEventSubSubscriptions,
    useClearAllSubscriptions,
    useResubscribeAllChannels,
  } = useHelpaApi()
  const { data: streamAlertsChannels } = useStreamAlertsChannels()

  const addChannelMutation = useAddChannelToStreamAlerts()
  const removeChannelMutation = useRemoveChannelFromStreamAlerts()

  const {
    data: subscriptions,
    refetch: refetchSubscriptions,
    isFetching: isLoadingSubscriptions,
  } = useEventSubSubscriptions()
  const clearAllMutation = useClearAllSubscriptions()
  const resubscribeMutation = useResubscribeAllChannels()

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
        setChannelToAdd("")
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
        setChannelToRemove("")
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
                {streamAlertsChannels?.map((channel: StreamAlertsChannel) => (
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

      <hr />

      <h4>
        EventSub Subscriptions{" "}
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => refetchSubscriptions()}
          disabled={isLoadingSubscriptions}
        >
          {isLoadingSubscriptions ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <i className="fa-solid fa-arrows-rotate"></i>
          )}{" "}
          Refresh
        </Button>
      </h4>

      {subscriptions && (
        <p>
          <Badge bg="primary">Total: {subscriptions.length}</Badge>{" "}
          <Badge bg="success">
            Enabled:{" "}
            {
              subscriptions.filter(
                (s: EventSubSubscription) => s.status === "enabled"
              ).length
            }
          </Badge>{" "}
          {subscriptions.filter(
            (s: EventSubSubscription) => s.status !== "enabled"
          ).length > 0 && (
            <Badge bg="warning">
              Other:{" "}
              {
                subscriptions.filter(
                  (s: EventSubSubscription) => s.status !== "enabled"
                ).length
              }
            </Badge>
          )}
        </p>
      )}

      <Container>
        <Row>
          <Col>
            {clearAllMutation.isPending ? (
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to clear ALL EventSub subscriptions?"
                    )
                  ) {
                    clearAllMutation.mutate()
                  }
                }}
                disabled={clearAllMutation.isPending}
              >
                <i className="fa-solid fa-trash pe-1"></i> Clear All
                Subscriptions
              </Button>
            )}
          </Col>
          <Col>
            {resubscribeMutation.isPending ? (
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="success"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to re-subscribe all watched channels?"
                    )
                  ) {
                    resubscribeMutation.mutate()
                  }
                }}
                disabled={resubscribeMutation.isPending}
              >
                <i className="fa-solid fa-rotate pe-1"></i> Re-subscribe All
                Channels
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default ManageStreamAlerts
