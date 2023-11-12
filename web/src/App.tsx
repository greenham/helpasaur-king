import * as React from "react";
import TopNav from "./components/TopNav";
import { Outlet } from "react-router-dom";

class App extends React.Component {
  render() {
    return (
      <>
        <TopNav />
        <Outlet />
      </>
    );
  }
}

export default App;
