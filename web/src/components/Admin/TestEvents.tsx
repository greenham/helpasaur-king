import * as React from "react"
import { useState, useEffect } from "react"
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

interface TestEventConfig {
  eventType: RelayEvent
  streamEventType?: TwitchStreamEventType
  label: string
  icon: string
  variant: string
  key: string
  showInQuickActions: boolean
}

const TestEvents: React.FunctionComponent<TestEventsProps> = () => {
  const { useTriggerTestEvent } = useHelpaApi()
  const triggerMutation = useTriggerTestEvent()

  const [selectedEventKey, setSelectedEventKey] = useState<string>(
    TwitchStreamEventType.STREAM_ONLINE
  )
  const [customPayload, setCustomPayload] = useState<Record<string, unknown>>(
    {}
  )
  const [customPayloadText, setCustomPayloadText] = useState<string>("")
  const [jsonError, setJsonError] = useState<string>("")
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
      thumbnail:
        "https://static-cdn.jtvnw.net/jtv_user_pictures/greenham-channel_offline_image-b87d176b4fd46ebb-1920x1080.png",
      isMature: true,
      profileImage:
        "https://static-cdn.jtvnw.net/jtv_user_pictures/a2a41cdc-27e7-42fe-88b6-8ddd96e4fc40-profile_image-300x300.png",
    },
    [RelayEvent.WEEKLY_RACE_ROOM_CREATED]: {
      raceRoomUrl: "https://racetime.gg/alttp/test-weekly-race",
      startTimestamp: Math.floor((Date.now() + 3600 * 1000) / 1000), // 1 hour from now
    },
    [RelayEvent.JOIN_TWITCH_CHANNEL]: {
      channel: "greenham",
    },
    [RelayEvent.LEAVE_TWITCH_CHANNEL]: {
      channel: "greenham",
    },
    [RelayEvent.TWITCH_BOT_CONFIG_UPDATED]: {
      channel: "greenham",
      config: {
        active: true,
        commandsEnabled: true,
        commandPrefix: "$",
        textCommandCooldown: 10,
        practiceListsEnabled: true,
        allowModsToManagePracticeLists: true,
        weeklyRaceAlertEnabled: false,
      },
    },
  }

  const testEventConfigs: TestEventConfig[] = [
    {
      eventType: RelayEvent.STREAM_ALERT,
      streamEventType: TwitchStreamEventType.STREAM_ONLINE,
      label: "Stream Online",
      icon: "fa-solid fa-broadcast-tower",
      variant: "outline-primary",
      key: TwitchStreamEventType.STREAM_ONLINE,
      showInQuickActions: true,
    },
    {
      eventType: RelayEvent.STREAM_ALERT,
      streamEventType: TwitchStreamEventType.CHANNEL_UPDATE,
      label: "Channel Update",
      icon: "fa-solid fa-pen-to-square",
      variant: "outline-info",
      key: TwitchStreamEventType.CHANNEL_UPDATE,
      showInQuickActions: true,
    },
    {
      eventType: RelayEvent.WEEKLY_RACE_ROOM_CREATED,
      label: "Weekly Race",
      icon: "fa-solid fa-flag-checkered",
      variant: "outline-success",
      key: RelayEvent.WEEKLY_RACE_ROOM_CREATED,
      showInQuickActions: true,
    },
    {
      eventType: RelayEvent.JOIN_TWITCH_CHANNEL,
      label: "Join Channel",
      icon: "fa-solid fa-right-to-bracket",
      variant: "outline-warning",
      key: RelayEvent.JOIN_TWITCH_CHANNEL,
      showInQuickActions: true,
    },
    {
      eventType: RelayEvent.LEAVE_TWITCH_CHANNEL,
      label: "Leave Channel",
      icon: "fa-solid fa-right-from-bracket",
      variant: "outline-danger",
      key: RelayEvent.LEAVE_TWITCH_CHANNEL,
      showInQuickActions: true,
    },
    {
      eventType: RelayEvent.TWITCH_BOT_CONFIG_UPDATED,
      label: "Config Update",
      icon: "fa-solid fa-cog",
      variant: "outline-secondary",
      key: RelayEvent.TWITCH_BOT_CONFIG_UPDATED,
      showInQuickActions: true,
    },
  ]

  const handleTriggerEvent = () => {
    const selectedEventConfig = testEventConfigs.find(
      (e) => e.key === selectedEventKey
    )
    if (!selectedEventConfig) return

    const basePayload = defaultPayloads[selectedEventConfig.eventType] || {}
    const eventPayload = selectedEventConfig.streamEventType
      ? { ...basePayload, streamEventType: selectedEventConfig.streamEventType }
      : basePayload

    const payload: TestEventPayload = {
      eventType: selectedEventConfig.eventType,
      payload: showCustom ? customPayload : eventPayload,
    }
    triggerMutation.mutate(payload)
  }

  const handleQuickTrigger = (config: TestEventConfig) => {
    const basePayload = defaultPayloads[config.eventType] || {}
    const payload: TestEventPayload = {
      eventType: config.eventType,
      payload: config.streamEventType
        ? { ...basePayload, streamEventType: config.streamEventType }
        : basePayload,
    }
    triggerMutation.mutate(payload)
  }

  const getCurrentEventPayload = () => {
    const selectedEventConfig = testEventConfigs.find(
      (e) => e.key === selectedEventKey
    )
    if (!selectedEventConfig) return {}

    const basePayload = defaultPayloads[selectedEventConfig.eventType] || {}
    return selectedEventConfig.streamEventType
      ? { ...basePayload, streamEventType: selectedEventConfig.streamEventType }
      : basePayload
  }

  useEffect(() => {
    if (showCustom) {
      const payload = getCurrentEventPayload()
      setCustomPayload(payload)
      setCustomPayloadText(JSON.stringify(payload, null, 2))
      setJsonError("")
    }
  }, [showCustom, selectedEventKey])

  const handleJsonChange = (value: string) => {
    setCustomPayloadText(value)
    try {
      const parsed = JSON.parse(value)
      setCustomPayload(parsed)
      setJsonError("")
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON")
    }
  }

  const eventDescriptions: Record<RelayEvent, string> = {
    [RelayEvent.STREAM_ALERT]:
      "Simulates a stream going live or channel update",
    [RelayEvent.WEEKLY_RACE_ROOM_CREATED]:
      "Simulates the weekly race room being created",
    [RelayEvent.JOIN_TWITCH_CHANNEL]: "Simulates bot joining a Twitch channel",
    [RelayEvent.LEAVE_TWITCH_CHANNEL]: "Simulates bot leaving a Twitch channel",
    [RelayEvent.TWITCH_BOT_CONFIG_UPDATED]: "Simulates a configuration update",
  }

  return (
    <Card className="mb-4">
      <Card.Body>
        <Alert variant="info">
          <i className="fa-solid fa-circle-info"></i> Use these test events to
          simulate WebSocket relay events without actual Twitch/Discord
          activity. Events will be broadcast to all connected services.
        </Alert>

        <h6>Quick Actions</h6>
        <ButtonGroup className="mb-4 d-flex flex-wrap">
          {testEventConfigs
            .filter((config) => config.showInQuickActions)
            .map((config) => (
              <Button
                key={config.key}
                variant={config.variant}
                size="sm"
                onClick={() => handleQuickTrigger(config)}
                disabled={triggerMutation.isPending}
              >
                <i className={config.icon}></i> {config.label}
              </Button>
            ))}
        </ButtonGroup>

        <hr />

        <h6>Custom Event Trigger</h6>
        <Form>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Event Type</Form.Label>
                <Form.Select
                  value={selectedEventKey}
                  onChange={(e) => setSelectedEventKey(e.target.value)}
                  disabled={triggerMutation.isPending}
                >
                  {testEventConfigs.map((eventConfig) => (
                    <option key={eventConfig.key} value={eventConfig.key}>
                      {eventConfig.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  {
                    testEventConfigs.find((e) => e.key === selectedEventKey)
                      ?.eventType
                  }
                  :{" "}
                  {
                    eventDescriptions[
                      testEventConfigs.find((e) => e.key === selectedEventKey)
                        ?.eventType || RelayEvent.STREAM_ALERT
                    ]
                  }
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
                    rows={8}
                    value={customPayloadText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    disabled={triggerMutation.isPending}
                    placeholder='{"userLogin": "testuser", "title": "Test Stream"}'
                    style={{ fontFamily: "monospace" }}
                    spellCheck={false}
                    autoComplete="off"
                    isInvalid={!!jsonError}
                  />
                  {jsonError && (
                    <Form.Control.Feedback type="invalid">
                      <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                      {jsonError}
                    </Form.Control.Feedback>
                  )}
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
                      {JSON.stringify(
                        (() => {
                          const selectedEventConfig = testEventConfigs.find(
                            (e) => e.key === selectedEventKey
                          )
                          if (!selectedEventConfig) return {}
                          const basePayload =
                            defaultPayloads[selectedEventConfig.eventType] || {}
                          return selectedEventConfig.streamEventType
                            ? {
                                ...basePayload,
                                streamEventType:
                                  selectedEventConfig.streamEventType,
                              }
                            : basePayload
                        })(),
                        null,
                        2
                      )}
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
      </Card.Body>
    </Card>
  )
}

export default TestEvents
