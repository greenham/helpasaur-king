import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App";
import ErrorPage from "./error";
import CommandsPage from "./pages/CommandsPage";
import LivestreamsPage from "./pages/LivestreamsPage";
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
        path: "commands",
        element: <CommandsPage />,
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
