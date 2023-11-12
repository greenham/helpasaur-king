import * as React from "react";
import Container from "react-bootstrap/Container";
import CommandsList from "./components/CommandsList";
import LivestreamsList from "./components/LivestreamsList";

class App extends React.Component {
  render() {
    return (
      <Container>
        <h1>HelpasaurKing</h1>
        <LivestreamsList />
        <CommandsList />
      </Container>
    );
  }
}

export default App;
