import * as React from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import TopNav from "./components/TopNav";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { UserProvider } from "./contexts/user";
import { ToastProvider } from "./contexts/toasts";
import { useToast } from "./hooks/useToast";

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
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <ScrollRestoration />
        <ToastProvider>
          <TopNav />
          <Outlet />
        </ToastProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </UserProvider>
    </QueryClientProvider>
  );
};

export default App;
