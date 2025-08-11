// Incoming message type constants
export const CHAT_MESSAGE_TYPE = "chat.message"
export const CHAT_DM_TYPE = "chat.dm"
export const CHAT_PIN_TYPE = "chat.pin"
export const CHAT_UNPIN_TYPE = "chat.unpin"
export const CHAT_DELETE_TYPE = "chat.delete"
export const CHAT_PURGE_TYPE = "chat.purge"
export const ERROR_TYPE = "error"
export const PONG_TYPE = "pong"
export const RACE_DATA_TYPE = "race.data"
export const CHAT_HISTORY_TYPE = "chat.history"

export type IncomingMessageType =
  | typeof CHAT_MESSAGE_TYPE
  | typeof CHAT_DM_TYPE
  | typeof CHAT_PIN_TYPE
  | typeof CHAT_UNPIN_TYPE
  | typeof CHAT_DELETE_TYPE
  | typeof CHAT_PURGE_TYPE
  | typeof ERROR_TYPE
  | typeof PONG_TYPE
  | typeof RACE_DATA_TYPE
  | typeof CHAT_HISTORY_TYPE

// Outgoing action type constants
export const GETRACE_ACTION = "getrace"
export const GETHISTORY_ACTION = "gethistory"
export const MESSAGE_ACTION = "message"
export const PIN_MESSAGE_ACTION = "pin_message"
export const UNPIN_MESSAGE_ACTION = "unpin_message"
export const PING_ACTION = "ping"
export const SETINFO_ACTION = "setinfo"
export const MAKE_OPEN_ACTION = "make_open"
export const MAKE_INVITATIONAL_ACTION = "make_invitational"
export const BEGIN_ACTION = "begin"
export const CANCEL_ACTION = "cancel"
export const INVITE_ACTION = "invite"
export const ACCEPT_REQUEST_ACTION = "accept_request"
export const FORCE_UNREADY_ACTION = "force_unready"
export const REMOVE_ENTRANT_ACTION = "remove_entrant"
export const ADD_MONITOR_ACTION = "add_monitor"
export const REMOVE_MONITOR_ACTION = "remove_monitor"
export const OVERRIDE_STREAM_ACTION = "override_stream"

// Union type for all outgoing actions
export type OutgoingActionType =
  | typeof GETRACE_ACTION
  | typeof GETHISTORY_ACTION
  | typeof MESSAGE_ACTION
  | typeof PIN_MESSAGE_ACTION
  | typeof UNPIN_MESSAGE_ACTION
  | typeof PING_ACTION
  | typeof SETINFO_ACTION
  | typeof MAKE_OPEN_ACTION
  | typeof MAKE_INVITATIONAL_ACTION
  | typeof BEGIN_ACTION
  | typeof CANCEL_ACTION
  | typeof INVITE_ACTION
  | typeof ACCEPT_REQUEST_ACTION
  | typeof FORCE_UNREADY_ACTION
  | typeof REMOVE_ENTRANT_ACTION
  | typeof ADD_MONITOR_ACTION
  | typeof REMOVE_MONITOR_ACTION
  | typeof OVERRIDE_STREAM_ACTION

interface OutgoingMessageActionData {
  message: string
  pinned?: boolean
  actions?: Record<string, any> | null
  direct_to?: string | null
  guid: string
}

interface PinMessageActionData {
  message: string
}

interface SetInfoActionData {
  info_bot?: string
  info_user?: string
}

interface UserActionData {
  user: string
}

// Union type for all action-specific data
export type OutgoingActionData =
  | OutgoingMessageActionData
  | PinMessageActionData
  | SetInfoActionData
  | UserActionData

export type GetRaceAction = {
  action: typeof GETRACE_ACTION
}

export type GetHistoryAction = {
  action: typeof GETHISTORY_ACTION
}

export type MessageAction = {
  action: typeof MESSAGE_ACTION
  data: OutgoingMessageActionData
}

export type PinMessageAction = {
  action: typeof PIN_MESSAGE_ACTION
  data: PinMessageActionData
}

export type UnpinMessageAction = {
  action: typeof UNPIN_MESSAGE_ACTION
  data: PinMessageActionData
}

export type PingAction = {
  action: typeof PING_ACTION
}

export type SetInfoAction = {
  action: typeof SETINFO_ACTION
  data: SetInfoActionData
}

export type MakeOpenAction = {
  action: typeof MAKE_OPEN_ACTION
}

export type MakeInvitationalAction = {
  action: typeof MAKE_INVITATIONAL_ACTION
}

export type BeginAction = {
  action: typeof BEGIN_ACTION
}

export type CancelAction = {
  action: typeof CANCEL_ACTION
}

export type InviteAction = {
  action: typeof INVITE_ACTION
  data: UserActionData
}

export type AcceptRequestAction = {
  action: typeof ACCEPT_REQUEST_ACTION
  data: UserActionData
}

export type ForceUnreadyAction = {
  action: typeof FORCE_UNREADY_ACTION
  data: UserActionData
}

export type RemoveEntrantAction = {
  action: typeof REMOVE_ENTRANT_ACTION
  data: UserActionData
}

export type AddMonitorAction = {
  action: typeof ADD_MONITOR_ACTION
  data: UserActionData
}

export type OverrideStreamAction = {
  action: typeof OVERRIDE_STREAM_ACTION
  data: UserActionData
}

// Union type for all outgoing actions
export type RaceAction =
  | GetRaceAction
  | GetHistoryAction
  | MessageAction
  | PinMessageAction
  | UnpinMessageAction
  | PingAction
  | SetInfoAction
  | MakeOpenAction
  | MakeInvitationalAction
  | BeginAction
  | CancelAction
  | InviteAction
  | AcceptRequestAction
  | ForceUnreadyAction
  | RemoveEntrantAction
  | AddMonitorAction
  | OverrideStreamAction

interface UserData {
  id: string
  full_name: string
  name: string
  discriminator: string
  url: string
  avatar: string
  pronouns: string
  flair: string
  twitch_name: string
  twitch_channel: string
  can_moderate: boolean
}

type EntrantData = {
  user: UserData
  status: {
    value:
      | "requested"
      | "invited"
      | "declined"
      | "ready"
      | "not_ready"
      | "in_progress"
      | "done"
      | "dnf"
      | "dq"
    verbose_value: string
    help_text: string
  }
  finish_time: string | null // ISO 8601 duration or null
  finished_at: string | null // ISO 8601 date or null
  place: number
  place_ordinal: string
  score: number
  score_change: number | null
  comment: string | null
  has_comment: boolean
  stream_live: boolean
  stream_override: boolean
}

// Action buttons object
interface ActionButtons {
  // Define the structure of action buttons as needed
}

// Chat message object
interface ChatMessage {
  id: string
  user: UserData | null
  bot: string | null
  direct_to: UserData | null
  posted_at: string
  message: string
  message_plain: string
  highlight: boolean
  is_dm: boolean
  is_bot: boolean
  is_system: boolean
  is_pinned: boolean
  delay: string
  actions: ActionButtons | null
}

// Chat DM object
interface ChatDM {
  message: string
  from_user: UserData | null
  from_bot: string | null
  to: UserData
}

// Chat Delete object
interface ChatDelete {
  id: string
  user: UserData | null
  bot: string | null
  is_bot: boolean
  deleted_by: UserData
}

// Chat Purge object
interface ChatPurge {
  user: UserData
  purged_by: UserData
}

// Error object
interface Error {
  errors: string[]
}

// Types for incoming messages
export type ChatHistoryMessage = {
  type: typeof CHAT_HISTORY_TYPE
  messages: ChatMessage[]
}

export type ChatMessageMessage = {
  type: typeof CHAT_MESSAGE_TYPE
  message: ChatMessage
}

export type ChatDMMessage = {
  type: typeof CHAT_DM_TYPE
} & ChatDM

export type ChatPinMessage = {
  type: typeof CHAT_PIN_TYPE
  message: ChatMessage
}

export type ChatUnpinMessage = {
  type: typeof CHAT_UNPIN_TYPE
  message: ChatMessage
}

export type ChatDeleteMessage = {
  type: typeof CHAT_DELETE_TYPE
} & ChatDelete

export type ChatPurgeMessage = {
  type: typeof CHAT_PURGE_TYPE
} & ChatPurge

export type ErrorMessage = {
  type: typeof ERROR_TYPE
} & Error

export type PongMessage = {
  type: typeof PONG_TYPE
}

export type RaceDataMessage = {
  type: typeof RACE_DATA_TYPE
  race: RaceData
}

// Union type for all message types
export type IncomingMessage =
  | ChatHistoryMessage
  | ChatMessageMessage
  | ChatDMMessage
  | ChatPinMessage
  | ChatUnpinMessage
  | ChatDeleteMessage
  | ChatPurgeMessage
  | ErrorMessage
  | PongMessage
  | RaceDataMessage

export type NewRaceData = {
  goal: string // A string indicating a goal name.
  custom_goal?: string // A string indicating a custom goal name.
  team_race?: boolean // Boolean, initiates a team race instead of a regular one.
  invitational?: boolean // Boolean, sets the race room to be invite-only if enabled.
  unlisted?: boolean // Boolean, sets the race room to be unlisted if enabled. Only allowed if the category supports unlisted rooms.
  info_user?: string // String, giving useful information for race entrants. Can be edited by race monitors.
  info_bot?: string // String, giving useful information for race entrants. Can only be edited by bots.
  require_even_teams?: boolean // Boolean, requires all teams to have the same number of entrants before the race can start. Only applicable if team_race is true.
  start_delay: number // Integer (10-60), number of seconds the countdown should run for. Required.
  time_limit: number // Integer (1-72), maximum number of hours the race is allowed to run for. Required.
  time_limit_auto_complete?: boolean // Boolean, changes race behavior if everyone forfeits (race is considered completed/recordable instead of canceled).
  streaming_required?: boolean // Boolean, indicates if race entrants must have a live stream to race. If not supplied, the category's default streaming rules are applied. If the category does not allow streaming rules to be overridden, this field is ignored.
  auto_start?: boolean // Boolean, if true then the race will start as soon as everyone is ready. If false, it must be force-started.
  allow_comments?: boolean // Boolean, allows entrants to add a comment to their result when finished.
  hide_comments?: boolean // Boolean, causes comments to be hidden until the race is finished. Only applicable if allow_comments is true.
  allow_prerace_chat?: boolean // Boolean, allows users to chat before the race begins (doesn't affect race monitors or moderators).
  allow_midrace_chat?: boolean // Boolean, allows users to chat while the race is ongoing (doesn't affect race monitors or moderators).
  allow_non_entrant_chat?: boolean // Boolean, allow users who are not entered in the race to chat (doesn't affect race monitors or moderators).
  chat_message_delay: number // Integer (0-90), number of seconds to hold a message for before displaying it (doesn't affect race monitors or moderators). Required.
}

export type RaceData = {
  version: number
  name: string
  category: {
    name: string
    short_name: string
    slug: string
    url: string
    data_url: string
  }
  status: {
    value:
      | "open"
      | "invitational"
      | "pending"
      | "in_progress"
      | "finished"
      | "cancelled"
    verbose_value: string
    help_text: string
  }
  url: string
  data_url: string
  websocket_url: string
  websocket_bot_url: string
  websocket_oauth_url: string
  goal: {
    name: string
    custom: boolean
  }
  info: string
  info_bot: string
  info_user: string
  entrants_count: number
  entrants_count_finished: number
  entrants_count_inactive: number
  entrants: EntrantData[]
  opened_at: string // ISO 8601 date
  start_delay: string // ISO 8601 duration
  started_at: string | null // ISO 8601 date or null
  ended_at: string | null // ISO 8601 date or null
  cancelled_at: string | null // ISO 8601 date or null
  unlisted: boolean
  time_limit: string // ISO 8601 duration
  time_limit_auto_complete: boolean
  streaming_required: boolean
  auto_start: boolean
  opened_by: UserData | null
  monitors: UserData[]
  recordable: boolean
  recorded: boolean
  recorded_by: UserData | null
  allow_comments: boolean
  hide_comments: boolean
  allow_midrace_chat: boolean
  allow_non_entrant_chat: boolean
  chat_message_delay: string // ISO 8601 duration
}
