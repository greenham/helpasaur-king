import { Command } from "../types/commands";

const API_URL = process.env.API_URL;

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

export const joinTwitchChannel = async () => {
  const response = await fetch(`${API_URL}/twitch/join`, {
    method: "POST",
    credentials: "include",
  });
  try {
    await handleApiResponse(response);
  } catch (e) {
    throw e;
  }
  return response.json();
};

export const leaveTwitchChannel = async () => {
  const response = await fetch(`${API_URL}/twitch/leave`, {
    method: "POST",
    credentials: "include",
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

async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const responseJson = await response.json();
    const message = responseJson.message || "API returned an error";
    throw new Error(message);
  }
}
