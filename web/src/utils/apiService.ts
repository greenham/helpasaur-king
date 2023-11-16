const API_URL = process.env.API_URL;

export const helpaApiFetcher = (url: string) => {
  return fetch(`${API_URL}${url}`).then((data) => data.json());
};
