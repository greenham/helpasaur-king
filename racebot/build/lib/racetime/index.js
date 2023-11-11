"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importStar(require("axios"));
const ws_1 = __importDefault(require("ws"));
const { RACETIME_BASE_URL, RACETIME_WSS_URL } = process.env;
class RacetimeBot {
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    static initialize(clientId, clientSecret) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Requesting access token...`);
            const response = yield (0, axios_1.default)({
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
        });
    }
    startRace(gameCategorySlug, raceData) {
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
            (0, axios_1.default)(startRaceRequest)
                .then((response) => {
                if (response.status === 201) {
                    // Handle a successful creation (201 Created) response
                    const locationHeader = response.headers.location;
                    console.log("Race room created. Location:", locationHeader);
                    resolve(locationHeader);
                }
                else {
                    // Handle other response statuses or errors here
                    console.log("Received an unexpected response:", response.status);
                    reject(false);
                }
            })
                .catch((error) => {
                if (error instanceof axios_1.AxiosError) {
                    if (error.response) {
                        if (error.response.status === 422) {
                            // Handle an unprocessable entity (422 Unprocessable Entity) response
                            const errors = error.response.data;
                            console.log("Validation errors:", errors);
                        }
                        else {
                            console.log("Received an unexpected response:", error.response.status);
                        }
                    }
                    else if (error.request) {
                        // The request was made but no response was received
                        // `error.request` is an instance of http.ClientRequest
                        console.log(error.request);
                    }
                    else {
                        // Something happened in setting up the request that triggered an Error
                        console.log("Error", error.message);
                    }
                    console.log(error.config);
                }
                else {
                    console.log("Caught exception outside of Axios:", error);
                }
                reject(false);
            });
        });
    }
    connectToRaceRoom(raceRoomSlug) {
        return new Promise((resolve, reject) => {
            // get websocket bot url via API
            console.log("Fetching race details...");
            axios_1.default
                .get(`${RACETIME_BASE_URL}${raceRoomSlug}/data`)
                .then((response) => {
                console.log("Race details:", response.data);
                const raceData = response.data;
                if (!raceData.websocket_bot_url) {
                    reject("No websocket bot URL in response data");
                }
                const raceRoomWebsocketUrl = `${RACETIME_WSS_URL}${raceData.websocket_bot_url}`;
                console.log("Connecting to websocket:", raceRoomWebsocketUrl);
                const wsRaceRoom = new ws_1.default(raceRoomWebsocketUrl + `?token=${this.accessToken}`);
                wsRaceRoom.on("error", console.error);
                wsRaceRoom.on("close", (code, reason) => {
                    console.log(`Disconnected from ${raceRoomSlug}, reason: ${reason}`);
                });
                wsRaceRoom.on("open", () => {
                    console.log("Opened websocket connection to race room:", raceRoomSlug);
                    resolve(wsRaceRoom);
                });
            })
                .catch(reject);
        });
    }
}
exports.default = RacetimeBot;
