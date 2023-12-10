import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";

import App from "./App";
import ErrorPage from "./error";
import CommandsPage from "./pages/CommandsPage";
import LivestreamsPage from "./pages/LivestreamsPage";
import TwitchBotPage from "./pages/TwitchBotPage";
import "./styles.scss";

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
    ],
  },
]);

const container = document.getElementById("app");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
