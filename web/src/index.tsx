import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";

import App from "./App";
import ErrorPage from "./error";
import PageNotFound from "./404";
import CommandsPage from "./pages/CommandsPage";
import LivestreamsPage from "./pages/LivestreamsPage";
import TwitchBotPage from "./pages/TwitchBotPage";
import DiscordBotPage from "./pages/DiscordBotPage";
import AdminPage from "./pages/AdminPage";
import "./styles.scss";

const basename = process.env.PUBLIC_URL || "/";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <CommandsPage />,
      },
      {
        path: "streams",
        element: <LivestreamsPage />,
      },
      {
        path: "livestreams",
        loader: async () => {
          return redirect("/streams");
        },
      },
      {
        path: "commands",
        element: <CommandsPage />,
      },
      {
        path: "twitch",
        element: <TwitchBotPage />,
      },
      {
        path: "discord",
        element: <DiscordBotPage />,
      },
      {
        path: "admin",
        element: <AdminPage />,
      },
      {
        path: "*",
        element: <PageNotFound />,
      },
    ],
  },
], { basename });

const container = document.getElementById("app");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
