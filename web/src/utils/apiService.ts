import { Command } from "../types/commands";

const API_URL = process.env.API_URL;

export const getCommands = async () => {
  const response = await fetch(`${API_URL}/commands`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export const getLivestreams = async () => {
  const response = await fetch(`${API_URL}/streams/live`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export const getConfig = async () => {
  const response = await fetch(`${API_URL}/web/config`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/me`, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export const helpaApiWithCredentialsFetcher = (url: string) => {
  return fetch(`${API_URL}${url}`, { credentials: "include" }).then((data) =>
    data.json()
  );
};

export const createCommand = (command: Command) => {
  return fetch(`${API_URL}/commands`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  }).then((data) => data.json());
};

export const updateCommand = (command: Command) => {
  return fetch(`${API_URL}/commands`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  }).then((data) => data.json());
};
