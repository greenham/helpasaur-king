import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App";
import ErrorPage from "./error";
import CommandsList from "./components/CommandsList";
import LivestreamsList from "./components/LivestreamsList";
import "./styles.scss";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "streams",
        element: <LivestreamsList />,
      },
      {
        path: "commands",
        element: <CommandsList />,
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
