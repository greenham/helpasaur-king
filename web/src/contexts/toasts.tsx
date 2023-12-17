import * as React from "react";
import { toastReducer } from "../reducers/toasts";
import DefaultToastContainer from "../components/DefaultToastContainer";
import { IStreamAlertToast, IToast } from "../types/toasts";

interface ToastProviderProps {
  children: React.ReactNode;
}
interface ToastContextProps {
  success: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
  remove: (id: number) => void;
  streamAlert: (streamAlert: IStreamAlertToast) => void;
}

const initialState: { toasts: IToast[] } = {
  toasts: [],
};

export const ToastContext = React.createContext({} as ToastContextProps);
export const ToastProvider: React.FunctionComponent<ToastProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = React.useReducer(toastReducer, initialState);

  const addToast = (variant: string, message: string) => {
    const id = Math.floor(Math.random() * 10000000);
    dispatch({ type: "ADD_TOAST", payload: { id, message, variant } });
  };

  const remove = (id: number) => {
    dispatch({ type: "DELETE_TOAST", payload: id });
  };

  const success = (message: string) => {
    addToast("success", message);
  };

  const warning = (message: string) => {
    addToast("warning", message);
  };

  const info = (message: string) => {
    addToast("info", message);
  };

  const error = (message: string) => {
    addToast("error", message);
  };

  const streamAlert = (streamAlertToast: IStreamAlertToast) => {
    console.log(state.toasts);
    console.log(streamAlertToast);
    if (
      state.toasts.some((toast: IToast) => toast.id === streamAlertToast.id)
    ) {
      console.log("Stream alert already exists in toasts");
      return;
    }

    dispatch({ type: "ADD_TOAST", payload: streamAlertToast });
  };

  const value: ToastContextProps = {
    success,
    warning,
    info,
    error,
    remove,
    streamAlert,
  };

  return (
    <ToastContext.Provider value={value}>
      <DefaultToastContainer toasts={state.toasts} />
      {children}
    </ToastContext.Provider>
  );
};
