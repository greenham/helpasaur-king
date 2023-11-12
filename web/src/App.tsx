import * as React from "react";
import CommandsList from "./components/CommandsList";
import LivestreamsList from "./components/LivestreamsList";
import TopNav from "./components/TopNav";

class App extends React.Component {
  render() {
    return (
      <>
        <TopNav />
        <LivestreamsList />
        <CommandsList />
      </>
    );
  }
}

export default App;
