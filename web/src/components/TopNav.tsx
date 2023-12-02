import * as React from "react";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import { LinkContainer } from "react-router-bootstrap";

const clientId = "w81l1hairuptw4izjeg5m5ol4g2lel";
const redirectUri = encodeURIComponent(
  "https://api-dev.helpasaur.com/auth/twitch"
);
const scope = "";
const twitchLoginUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

const resources = [
  {
    href: "https://alttp-wiki.net/index.php/Main_Page",
    target: "_blank",
    rel: "noopener,noreferrer",
    icon: "fa-solid fa-arrow-up-right-from-square",
    text: "Speedrun Wiki",
  },
  {
    href: "https://spannerisms.github.io/lttphack/",
    target: "_blank",
    rel: "noopener,noreferrer",
    icon: "fa-solid fa-arrow-up-right-from-square",
    text: "Practice Hack",
  },
  {
    href: "https://strats.alttp.run/",
    target: "_blank",
    rel: "noopener,noreferrer",
    icon: "fa-solid fa-arrow-up-right-from-square",
    text: "Strat Hub",
  },
  {
    href: "http://www.speedrun.com/alttp",
    target: "_blank",
    rel: "noopener,noreferrer",
    icon: "fa-solid fa-arrow-up-right-from-square",
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

const popover = (
  <Popover placement="bottom" id="helpa-popover">
    <Popover.Header as="h3">Hello!</Popover.Header>
    <Popover.Body className="bg-dark">
      I'm <strong>Helpasaur King</strong> and I'm very high in potassium... like
      a banana!
    </Popover.Body>
  </Popover>
);

function TopNav() {
  const logo = new URL("/src/img/logo.png", import.meta.url).toString();

  return (
    <>
      <Navbar expand="lg" bg="primary" sticky="top">
        <Container>
          <OverlayTrigger placement="bottom" overlay={popover}>
            <Navbar.Brand>
              <img
                alt=""
                src={logo}
                width="30"
                height="30"
                className="d-inline-block align-top"
              />
            </Navbar.Brand>
          </OverlayTrigger>
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
              <Nav.Link href={twitchLoginUrl} rel="noopener,noreferrer">
                <i className="fa-solid fa-key"></i>&nbsp;&nbsp;Log In
              </Nav.Link>
            </Nav>
            <Nav className="justify-content-end">
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
