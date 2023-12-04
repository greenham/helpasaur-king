const API_URL = process.env.API_URL;

export const getCommands = () => {
  return fetch(`${API_URL}/commands`).then((data) => data.json());
};

export const getLivestreams = () => {
  return fetch(`${API_URL}/streams/live`).then((data) => data.json());
};

export const getConfig = () => {
  return fetch(`${API_URL}/web/config`).then((data) => data.json());
};
