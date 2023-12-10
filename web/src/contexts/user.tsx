import { createContext } from "react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../utils/apiService";

export const UserContext = createContext({});

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FunctionComponent<UserProviderProps> = (
  props
) => {
  const userQuery = useQuery({ queryKey: ["user"], queryFn: getCurrentUser });
  return (
    <UserContext.Provider value={userQuery}>
      {props.children}
    </UserContext.Provider>
  );
};
