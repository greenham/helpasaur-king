import * as React from "react";
import { createContext, useReducer } from "react";
import { toastReducer } from "../reducers/toasts";
import DefaultToastContainer from "../components/DefaultToastContainer";
import { IToast } from "../types/toasts";

interface ToastProviderProps {
  children: React.ReactNode;
}
interface ToastContextProps {
  success: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
  remove: (id: number) => void;
}

const initialState: { toasts: IToast[] } = {
  toasts: [],
};

export const ToastContext = createContext({} as ToastContextProps);
export const ToastProvider: React.FunctionComponent<ToastProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(toastReducer, initialState);

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

  const value: ToastContextProps = { success, warning, info, error, remove };

  return (
    <ToastContext.Provider value={value}>
      <DefaultToastContainer toasts={state.toasts} />
      {children}
    </ToastContext.Provider>
  );
};
