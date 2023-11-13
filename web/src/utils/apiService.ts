const API_BASE_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

export const helpaApiFetcher = (url: string) => {
  return fetch(`${API_BASE_URL}${url}`, {
    headers: { Authorization: String(API_KEY) },
  }).then((data) => data.json());
};
