import { useContext } from "react";
import { WebsocketRelayContext } from "../contexts/ws-relay";

export const useWebsocketRelay = () => useContext(WebsocketRelayContext);
