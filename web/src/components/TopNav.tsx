import * as React from "react";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import { LinkContainer } from "react-router-bootstrap";

function TopNav() {
  const logo = new URL("/src/img/logo.png", import.meta.url).toString();
  const resources = [
    {
      href: "https://alttp-wiki.net/index.php/Main_Page",
      target: "_blank",
      rel: "noopener,noreferrer",
      icon: "fa-solid fa-caret-right",
      text: "Speedrun Wiki",
    },
    {
      href: "https://spannerisms.github.io/lttphack/",
      target: "_blank",
      rel: "noopener,noreferrer",
      icon: "fa-solid fa-caret-right",
      text: "Practice Hack",
    },
    {
      href: "https://strats.alttp.run/",
      target: "_blank",
      rel: "noopener,noreferrer",
      icon: "fa-solid fa-caret-right",
      text: "Strat Hub",
    },
    {
      href: "http://www.speedrun.com/alttp",
      target: "_blank",
      rel: "noopener,noreferrer",
      icon: "fa-solid fa-caret-right",
      text: "Leaderboards",
    },
    {
      divider: true, // Divider element
    },
    {
      href: "https://discord.gg/8cskCK4",
      target: "_blank",
      rel: "noopener,noreferrer",
      icon: "fa-brands fa-discord",
      text: "Discord",
    },
  ];

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
                  <i className="fa-solid fa-terminal"></i>&nbsp;&nbsp;Commands
                </Nav.Link>
              </LinkContainer>
              <LinkContainer to="streams">
                <Nav.Link>
                  <i className="fa-brands fa-twitch"></i>&nbsp;&nbsp;ALttP
                  Streams
                </Nav.Link>
              </LinkContainer>
              <NavDropdown
                title={
                  <>
                    <i className="fa-solid fa-link"></i>&nbsp;&nbsp;Resources
                  </>
                }
                id="resources-dropdown"
              >
                {resources.map((resource, index) =>
                  resource.divider ? (
                    <NavDropdown.Divider key={index} />
                  ) : (
                    <NavDropdown.Item
                      key={index}
                      href={resource.href}
                      target={resource.target}
                      rel={resource.rel}
                    >
                      <i className={resource.icon}></i>&nbsp;&nbsp;
                      {resource.text}
                    </NavDropdown.Item>
                  )
                )}
              </NavDropdown>
            </Nav>
            <Nav className="justify-content-end">
              <Nav.Link
                href="https://twitch.tv/helpasaurking"
                target="_blank"
                rel="noopener,noreferrer"
              >
                <i className="fa-solid fa-robot"></i>&nbsp;&nbsp;Twitch Bot
              </Nav.Link>
              <Nav.Link
                href="https://github.com/greenham/helpasaur-king"
                target="_blank"
                rel="noopener,noreferrer"
              >
                <i className="fa-brands fa-github"></i>&nbsp;&nbsp;GitHub
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default TopNav;
