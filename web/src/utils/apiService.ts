import { Command } from "../types/commands";

const API_URL = process.env.API_HOST + "/api";

export const getCommands = async () => {
  const response = await fetch(`${API_URL}/commands`);
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const getLivestreams = async () => {
  const response = await fetch(`${API_URL}/streams/live`);
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const getConfig = async () => {
  const response = await fetch(`${API_URL}/web/config`);
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const getDiscordJoinUrl = async () => {
  const response = await fetch(`${API_URL}/discord/joinUrl`);
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/me`, { credentials: "include" });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const getTwitchBotConfig = async () => {
  const response = await fetch(`${API_URL}/me/twitch`, {
    credentials: "include",
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const getTwitchBotChannels = async () => {
  const response = await fetch(`${API_URL}/twitch/channels`, {
    credentials: "include",
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const joinTwitchChannel = async (twitchUsername?: string) => {
  const body = twitchUsername ? { channel: twitchUsername } : {};
  const response = await fetch(`${API_URL}/twitch/join`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const leaveTwitchChannel = async (twitchUsername?: string) => {
  const body = twitchUsername ? { channel: twitchUsername } : {};
  const response = await fetch(`${API_URL}/twitch/leave`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const createCommand = async (command: Command) => {
  const response = await fetch(`${API_URL}/commands`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const updateCommand = async (command: Command) => {
  const response = await fetch(`${API_URL}/commands/${command._id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const deleteCommand = async (command: Command) => {
  const response = await fetch(`${API_URL}/commands/${command._id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const getStreamAlertsChannels = async () => {
  const response = await fetch(`${API_URL}/streamAlerts/channels`, {
    credentials: "include",
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const addChannelToStreamAlerts = async (twitchUsername: string) => {
  const response = await fetch(`${API_URL}/streamAlerts/channels`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channels: [twitchUsername] }),
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }

  return response.json();
};

export const removeChannelFromStreamAlerts = async (twitchUserId: string) => {
  const response = await fetch(
    `${API_URL}/streamAlerts/channels/${twitchUserId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }

  return response.json();
};

async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const responseJson = await response.json();
    const message = responseJson.message || "API returned an error";
    throw new Error(message);
  }
}
