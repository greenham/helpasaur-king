import * as React from "react";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";

function TopNav() {
  const logo = new URL("/src/img/logo.png", import.meta.url).toString();
  return (
    <>
      <Navbar expand="lg" bg="primary" data-bs-theme="dark" sticky="top">
        <Container>
          <Navbar.Brand href="#home">
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
              <Nav.Link href="#commands">Commands</Nav.Link>
              <Nav.Link href="#streams">ALttP Streams</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default TopNav;
