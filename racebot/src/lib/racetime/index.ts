import axios, { AxiosError } from "axios";
import WebSocket from "ws";
import { NewRaceData } from "./types";
const { RACETIME_BASE_URL, RACETIME_WSS_URL } = process.env;

class RacetimeBot {
  accessToken: string;

  private constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static async initialize(
    clientId: string,
    clientSecret: string
  ): Promise<RacetimeBot> {
    console.log(`Requesting access token...`);
    const response = await axios({
      method: "POST",
      url: `${RACETIME_BASE_URL}/o/token`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      },
    });
    console.log(`Received access token: ${response.data.access_token}`);
    return new RacetimeBot(response.data.access_token);
  }

  startRace(gameCategorySlug: string, raceData: NewRaceData): Promise<string> {
    return new Promise((resolve, reject) => {
      const startRaceRequest = {
        method: "POST",
        url: `${RACETIME_BASE_URL}/o/${gameCategorySlug}/startrace`,
        data: raceData,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };

      // Responses:
      //  201 Created
      //    If form is valid and race room is succesfully opened, a 201 is returned.
      //    The Location header will provide the URL of the opened race room.
      //  422 Unprocessable Entity
      //    If form is invalid, a 422 is returned.
      //    The content body (JSON) will contain an array of errors indicating what the problem(s) were.
      axios(startRaceRequest)
        .then((response) => {
          if (response.status === 201) {
            // Handle a successful creation (201 Created) response
            const locationHeader = response.headers.location;
            console.log("Race room created. Location:", locationHeader);
            resolve(locationHeader);
          } else {
            // Handle other response statuses or errors here
            console.log("Received an unexpected response:", response.status);
            reject(false);
          }
        })
        .catch((error: any) => {
          if (error instanceof AxiosError) {
            if (error.response) {
              if (error.response.status === 422) {
                // Handle an unprocessable entity (422 Unprocessable Entity) response
                const errors = error.response.data;
                console.log("Validation errors:", errors);
              } else {
                console.log(
                  "Received an unexpected response:",
                  error.response.status
                );
              }
            } else if (error.request) {
              // The request was made but no response was received
              // `error.request` is an instance of http.ClientRequest
              console.log(error.request);
            } else {
              // Something happened in setting up the request that triggered an Error
              console.log("Error", error.message);
            }
            console.log(error.config);
          } else {
            console.log("Caught exception outside of Axios:", error);
          }

          reject(false);
        });
    });
  }

  connectToRaceRoom(raceRoomSlug: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      // get websocket bot url via API
      console.log("Fetching race details...");
      axios
        .get(`${RACETIME_BASE_URL}${raceRoomSlug}/data`)
        .then((response) => {
          console.log("Race details:", response.data);
          const raceData = response.data;

          if (!raceData.websocket_bot_url) {
            reject("No websocket bot URL in response data");
          }

          const raceRoomWebsocketUrl = `${RACETIME_WSS_URL}${raceData.websocket_bot_url}`;
          console.log("Connecting to websocket:", raceRoomWebsocketUrl);
          const wsRaceRoom: WebSocket = new WebSocket(
            raceRoomWebsocketUrl + `?token=${this.accessToken}`
          );
          wsRaceRoom.on("error", console.error);
          wsRaceRoom.on("close", (code: number, reason: Buffer) => {
            console.log(`Disconnected from ${raceRoomSlug}, reason: ${reason}`);
          });

          wsRaceRoom.on("open", () => {
            console.log(
              "Opened websocket connection to race room:",
              raceRoomSlug
            );
            resolve(wsRaceRoom);
          });
        })
        .catch(reject);
    });
  }
}

export default RacetimeBot;
