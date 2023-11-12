import * as React from "react";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import { LinkContainer } from "react-router-bootstrap";

function TopNav() {
  const logo = new URL("/src/img/logo.png", import.meta.url).toString();
  return (
    <>
      <Navbar expand="lg" bg="primary" data-bs-theme="dark" sticky="top">
        <Container>
          <Navbar.Brand href="/">
            <img
              alt=""
              src={logo}
              width="30"
              height="30"
              className="d-inline-block align-top"
            />{" "}
            Helpasaur King
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="top-nav" />
          <Navbar.Collapse id="top-nav" role="">
            <Nav className="me-auto">
              <LinkContainer to="commands">
                <Nav.Link>Commands</Nav.Link>
              </LinkContainer>
              <LinkContainer to="streams">
                <Nav.Link>ALttP Streams</Nav.Link>
              </LinkContainer>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default TopNav;
