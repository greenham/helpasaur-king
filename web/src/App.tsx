import * as React from "react";
import { Outlet, ScrollRestoration } from "react-router-dom";
import TopNav from "./components/TopNav";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getCurrentUser } from "./utils/apiService";
import { UserContext } from "./contexts/user";

const queryClient = new QueryClient();

interface AppProps {}
const App: React.FunctionComponent<AppProps> = () => {
  const userQuery = useQuery({ queryKey: ["user"], queryFn: getCurrentUser });
  return (
    <UserContext.Provider value={userQuery}>
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
