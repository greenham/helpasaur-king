import * as React from "react";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import { LinkContainer } from "react-router-bootstrap";

function TopNav() {
  const logo = new URL("/src/img/logo.png", import.meta.url).toString();
  return (
    <>
      <Navbar expand="lg" bg="primary" sticky="top">
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
                <Nav.Link>
                  <i className="fa-solid fa-terminal"></i> Commands
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="streams">
                <Nav.Link>
                  <i className="fa-brands fa-twitch"></i> ALttP Streams
                </Nav.Link>
              </LinkContainer>
              <Nav.Link
                href="https://twitch.tv/helpasaurking"
                target="_blank"
                rel="noopener,noreferrer"
              >
                <i className="fa-solid fa-robot"></i> Twitch Bot
              </Nav.Link>
              {/* <NavDropdown
                title={
                  <>
                    <i className="fa-solid fa-link"></i> Quick Links
                  </>
                }
                id="quick-links-dropdown"
              >
                <NavDropdown.Item
                  href="https://alttp-wiki.net/index.php/Main_Page"
                  target="_blank"
                  rel="noopener,noreferrer"
                >
                  Wiki
                </NavDropdown.Item>
                <NavDropdown.Item
                  href="https://spannerisms.github.io/lttphack/"
                  target="_blank"
                  rel="noopener,noreferrer"
                >
                  Practice Hack
                </NavDropdown.Item>
                <NavDropdown.Item
                  href="https://strats.alttp.run/"
                  target="_blank"
                  rel="noopener,noreferrer"
                >
                  Room LBs
                </NavDropdown.Item>

                <NavDropdown.Divider />
                <NavDropdown.Item href="https://discord.gg/8cskCK4">
                  Discord
                </NavDropdown.Item>
              </NavDropdown> */}
            </Nav>
            <Nav className="justify-content-end">
              <Nav.Link
                href="https://github.com/greenham/helpasaur-king"
                target="_blank"
                rel="noopener,noreferrer"
              >
                <i className="fa-brands fa-github"></i> GitHub
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default TopNav;
