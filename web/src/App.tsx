import * as React from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastProvider } from "./contexts/toasts";
import { WebsocketRelayProvider } from "./contexts/ws-relay";
import { useToast } from "./hooks/useToast";
import TopNav from "./components/TopNav";

interface AppProps {}
const App: React.FunctionComponent<AppProps> = () => {
  const toast = useToast();

  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data !== undefined) {
          toast.error(`Something went wrong: ${error.message}`);
        }
      },
    }),
  });

  return (
    <ToastProvider>
      <WebsocketRelayProvider>
        <QueryClientProvider client={queryClient}>
          <ScrollRestoration />
          <TopNav />
          <Outlet />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </WebsocketRelayProvider>
    </ToastProvider>
  );
};

export default App;
