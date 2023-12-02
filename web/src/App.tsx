import * as React from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import TopNav from "./components/TopNav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();
import useUser from "./hooks/useUser";
import { UserContext } from "./contexts/user";

interface AppProps {}
const App: React.FunctionComponent<AppProps> = () => {
  return (
    <UserContext.Provider value={}>
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
