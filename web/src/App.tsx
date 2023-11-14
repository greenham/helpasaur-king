import * as React from "react";
import TopNav from "./components/TopNav";
import { Outlet, ScrollRestoration } from "react-router-dom";

class App extends React.Component {
  render() {
    return (
      <>
        <ScrollRestoration />
        <TopNav />
        <Outlet />
      </>
    );
  }
}

export default App;
