import * as React from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import TopNav from "./components/TopNav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import UserProvider from "./components/UserProvider";

const queryClient = new QueryClient();

interface AppProps {}
const App: React.FunctionComponent<AppProps> = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ScrollRestoration />
        <TopNav />
        <Outlet />
        <ReactQueryDevtools initialIsOpen={false} />
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
