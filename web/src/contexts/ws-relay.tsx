import * as React from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "../hooks/useToast";
import { IStreamAlertToast } from "../types/toasts";
const WEBSOCKET_RELAY_SERVER = String(process.env.WEBSOCKET_RELAY_SERVER);
const STREAM_ONLINE_EVENT = "stream.online";
const CHANNEL_UPDATE_EVENT = "channel.update";
const wsRelay = io(WEBSOCKET_RELAY_SERVER, {
  query: { clientId: "web-client" },
  autoConnect: false,
});

interface WebsocketRelayProviderProps {
  children: React.ReactNode;
}
interface WebsocketRelayContextProps {
  socket: Socket;
  isConnected: boolean;
}

export const WebsocketRelayContext = React.createContext(
  {} as WebsocketRelayContextProps
);
export const WebsocketRelayProvider: React.FunctionComponent<
  WebsocketRelayProviderProps
> = ({ children }) => {
  const toast = useToast();
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    // Connect to websocket relay to listen for events like stream alerts and race rooms
    console.log(
      `Connecting to websocket relay server: ${WEBSOCKET_RELAY_SERVER}...`
    );
    wsRelay.connect();
    wsRelay.on("connect_error", (err) => {
      console.log(`Connection error!`);
      console.log(err);
    });
    wsRelay.on("connect", () => {
      console.log(`✅ Connected! Socket ID: ${wsRelay.id}`);
      setIsConnected(true);
    });

    // @TODO: create type for stream alert event (it's a union of TwitchStream and eventType: STREAM_ONLINE_EVENT | CHANNEL_UPDATE_EVENT)
    wsRelay.on("streamAlert", ({ payload: stream, source }) => {
      if (
        ![STREAM_ONLINE_EVENT, CHANNEL_UPDATE_EVENT].includes(stream.eventType)
      ) {
        return;
      }
      console.log(`Received stream alert from ${source}:`, stream.eventType);
      const streamAlertToast: IStreamAlertToast = {
        id: stream.id,
        variant: "streamAlert",
        title:
          stream.eventType === STREAM_ONLINE_EVENT
            ? "Now live on Twitch!"
            : "Changed title:",
        stream,
      };
      toast.streamAlert(streamAlertToast);
    });
  }, []);

  const value: WebsocketRelayContextProps = { socket: wsRelay, isConnected };

  return (
    <WebsocketRelayContext.Provider value={value}>
      {children}
    </WebsocketRelayContext.Provider>
  );
};
