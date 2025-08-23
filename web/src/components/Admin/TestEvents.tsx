import * as React from "react"
import { useState } from "react"
import {
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Alert,
  ButtonGroup,
} from "react-bootstrap"
import {
  RelayEvent,
  TestEventPayload,
  TwitchStreamEventType,
} from "@helpasaur/types"
import { useHelpaApi } from "../../hooks/useHelpaApi"

interface TestEventsProps {}

const TestEvents: React.FunctionComponent<TestEventsProps> = () => {
  const { useTriggerTestEvent } = useHelpaApi()
  const triggerMutation = useTriggerTestEvent()

  const [selectedEvent, setSelectedEvent] = useState<RelayEvent>(
    RelayEvent.STREAM_ALERT
  )
  const [customPayload, setCustomPayload] = useState<Record<string, unknown>>(
    {}
  )
  const [showCustom, setShowCustom] = useState(false)

  const defaultPayloads: Record<RelayEvent, Record<string, unknown>> = {
    [RelayEvent.STREAM_ALERT]: {
      streamEventType: TwitchStreamEventType.STREAM_ONLINE,
      userId: "69420",
      userLogin: "greenham",
      displayName: "greenHam",
      gameId: "899559811",
      gameName: "The Legend of Zelda: A Link to the Past",
      title: "Testing ALttP",
      startedAt: new Date().toISOString(),
      thumbnail: "https://placedog.net/{width}/{height}",
      isMature: true,
      profileImage: "https://placedog.net/300",
    },
    [RelayEvent.WEEKLY_RACE_ROOM_CREATED]: {
      raceRoomUrl: "https://racetime.gg/alttp/test-weekly-race",
      startTimestamp: Math.floor((Date.now() + 3600 * 1000) / 1000), // 1 hour from now
    },
    [RelayEvent.JOIN_CHANNEL]: {
      channel: "#greenham",
      displayName: "greenHam",
    },
    [RelayEvent.LEAVE_CHANNEL]: {
      channel: "#greenham",
      displayName: "TestChannel",
    },
    [RelayEvent.CONFIG_UPDATE]: {
      roomId: "123456789",
      channelName: "greenham",
      commandsEnabled: true,
      practiceListsEnabled: true,
    },
  }

  const handleTriggerEvent = () => {
    const payload: TestEventPayload = {
      eventType: selectedEvent,
      payload: showCustom ? customPayload : defaultPayloads[selectedEvent],
    }
    triggerMutation.mutate(payload)
  }

  const handleQuickTrigger = (eventType: RelayEvent) => {
    const payload: TestEventPayload = {
      eventType,
      payload: defaultPayloads[eventType] || {},
    }
    triggerMutation.mutate(payload)
  }

  const eventDescriptions: Record<RelayEvent, string> = {
    [RelayEvent.STREAM_ALERT]:
      "Simulates a stream going live or channel update",
    [RelayEvent.WEEKLY_RACE_ROOM_CREATED]:
      "Simulates the weekly race room being created",
    [RelayEvent.JOIN_CHANNEL]: "Simulates bot joining a Twitch channel",
    [RelayEvent.LEAVE_CHANNEL]: "Simulates bot leaving a Twitch channel",
    [RelayEvent.CONFIG_UPDATE]: "Simulates a configuration update",
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">
          <i className="fa-solid fa-flask-vial"></i> Test Events
        </h5>
      </Card.Header>
      <Card.Body>
        <Alert variant="info">
          <i className="fa-solid fa-circle-info"></i> Use these test events to
          simulate WebSocket relay events without actual Twitch/Discord
          activity. Events will be broadcast to all connected services.
        </Alert>

        <h6>Quick Actions</h6>
        <ButtonGroup className="mb-4 d-flex flex-wrap">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => {
              const payload: TestEventPayload = {
                eventType: RelayEvent.STREAM_ALERT,
                payload: {
                  ...defaultPayloads[RelayEvent.STREAM_ALERT],
                  streamEventType: TwitchStreamEventType.STREAM_ONLINE,
                },
              }
              triggerMutation.mutate(payload)
            }}
            disabled={triggerMutation.isPending}
          >
            <i className="fa-solid fa-broadcast-tower"></i> Stream Online
          </Button>
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => {
              const payload: TestEventPayload = {
                eventType: RelayEvent.STREAM_ALERT,
                payload: {
                  ...defaultPayloads[RelayEvent.STREAM_ALERT],
                  streamEventType: TwitchStreamEventType.CHANNEL_UPDATE,
                },
              }
              triggerMutation.mutate(payload)
            }}
            disabled={triggerMutation.isPending}
          >
            <i className="fa-solid fa-pen-to-square"></i> Channel Update
          </Button>
          <Button
            variant="outline-success"
            size="sm"
            onClick={() =>
              handleQuickTrigger(RelayEvent.WEEKLY_RACE_ROOM_CREATED)
            }
            disabled={triggerMutation.isPending}
          >
            <i className="fa-solid fa-flag-checkered"></i> Weekly Race
          </Button>
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => handleQuickTrigger(RelayEvent.JOIN_CHANNEL)}
            disabled={triggerMutation.isPending}
          >
            <i className="fa-solid fa-right-to-bracket"></i> Join Channel
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => handleQuickTrigger(RelayEvent.LEAVE_CHANNEL)}
            disabled={triggerMutation.isPending}
          >
            <i className="fa-solid fa-right-from-bracket"></i> Leave Channel
          </Button>
        </ButtonGroup>

        <hr />

        <h6>Custom Event Trigger</h6>
        <Form>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Event Type</Form.Label>
                <Form.Select
                  value={selectedEvent}
                  onChange={(e) =>
                    setSelectedEvent(e.target.value as RelayEvent)
                  }
                  disabled={triggerMutation.isPending}
                >
                  {Object.values(RelayEvent).map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventType}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  {eventDescriptions[selectedEvent]}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Payload Type</Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    id="default-payload"
                    label="Use Default"
                    checked={!showCustom}
                    onChange={() => setShowCustom(false)}
                    disabled={triggerMutation.isPending}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    id="custom-payload"
                    label="Custom JSON"
                    checked={showCustom}
                    onChange={() => setShowCustom(true)}
                    disabled={triggerMutation.isPending}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>

          {showCustom && (
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Custom Payload (JSON)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    value={JSON.stringify(customPayload, null, 2)}
                    onChange={(e) => {
                      try {
                        setCustomPayload(JSON.parse(e.target.value))
                      } catch {
                        // Invalid JSON, don't update
                      }
                    }}
                    disabled={triggerMutation.isPending}
                    placeholder='{"userLogin": "testuser", "title": "Test Stream"}'
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {!showCustom && (
            <Row className="mb-3">
              <Col>
                <Card>
                  <Card.Body>
                    <pre className="mb-0" style={{ fontSize: "0.85rem" }}>
                      {JSON.stringify(defaultPayloads[selectedEvent], null, 2)}
                    </pre>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <Button
            variant="primary"
            onClick={handleTriggerEvent}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Triggering...
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt"></i> Trigger Event
              </>
            )}
          </Button>
        </Form>

        {triggerMutation.isError && (
          <Alert variant="danger" className="mt-3">
            <i className="fa-solid fa-triangle-exclamation"></i> Error
            triggering event: {triggerMutation.error?.message}
          </Alert>
        )}

        {triggerMutation.isSuccess && (
          <Alert variant="success" className="mt-3">
            <i className="fa-solid fa-check-circle"></i> Test event triggered
            successfully! Check Discord/Twitch for reactions.
          </Alert>
        )}
      </Card.Body>
    </Card>
  )
}

export default TestEvents
