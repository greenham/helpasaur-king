import { TwitchStream } from "./streams";

export interface IToast {
  id: number;
  variant: "success" | "warning" | "info" | "error" | "streamAlert";
  title?: string;
  message?: string;
}
export interface IStreamAlertToast extends IToast {
  variant: "streamAlert";
  stream: TwitchStream;
}
