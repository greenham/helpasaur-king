import * as React from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import TopNav from "./components/TopNav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();
import useUser from "./hooks/useUser";
const UserContext = React.createContext({});

interface AppProps {}
const App: React.FunctionComponent<AppProps> = () => {
  // Check for logged-in user
  const { data: user, isLoading: userLoading, isError: userError } = useUser();

  return (
    <UserContext.Provider value={{ user, userLoading, userError }}>
      <QueryClientProvider client={queryClient}>
        <ScrollRestoration />
        <TopNav />
        <Outlet />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </UserContext.Provider>
  );
};

export default App;
