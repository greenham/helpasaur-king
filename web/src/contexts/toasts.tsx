import * as React from "react";
import { createContext } from "react";

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastContext = createContext({});
export const ToastProvider: React.FunctionComponent<ToastProviderProps> = ({
  children,
}) => <ToastContext.Provider value={{}}>{children}</ToastContext.Provider>;
