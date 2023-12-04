import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../utils/apiService";
import { UserContext } from "../contexts/user";

interface UserProviderProps {
  children: React.ReactNode;
}

const UserProvider: React.FunctionComponent<UserProviderProps> = (props) => {
  const userQuery = useQuery({ queryKey: ["user"], queryFn: getCurrentUser });
  return (
    <UserContext.Provider value={userQuery}>
      {props.children}
    </UserContext.Provider>
  );
};

export default UserProvider;
