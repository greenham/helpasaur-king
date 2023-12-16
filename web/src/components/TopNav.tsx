import * as React from "react";
import {
  Button,
  Container,
  Image,
  Navbar,
  Nav,
  NavDropdown,
  OverlayTrigger,
  Popover,
} from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { getTwitchLoginUrl } from "../utils/utils";
import { useLocation } from "react-router-dom";
import { useUser } from "../hooks/useUser";

const RESOURCES = [
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
    text: "ALttP Discord",
  },
];

const popover = (
  <Popover placement="bottom" id="helpa-popover">
    <Popover.Header as="h3">Hello!</Popover.Header>
    <Popover.Body className="bg-dark">
      I'm <strong>Helpasaur King</strong> and I'm very high in potassium... like
      a banana! 🍌
    </Popover.Body>
  </Popover>
);

function TopNav() {
  const { data: user } = useUser();
  const logo = new URL("/src/img/logo.png", import.meta.url).toString();
  const location = useLocation();

  return (
    <>
      <Navbar expand="lg" bg="dark" sticky="top">
        <Container>
          <OverlayTrigger placement="bottom" overlay={popover}>
            <Navbar.Brand>
              <img
                alt=""
                src={logo}
                width="32"
                height="32"
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
              <LinkContainer to="twitch">
                <Nav.Link>
                  <i className="fa-solid fa-robot"></i>&nbsp;&nbsp;Twitch Bot
                </Nav.Link>
              </LinkContainer>
              {user && user.permissions.includes("admin") && (
                <LinkContainer to="admin">
                  <Nav.Link>
                    <i className="fa-solid fa-user-tie"></i>&nbsp;&nbsp;Admin
                  </Nav.Link>
                </LinkContainer>
              )}
            </Nav>
            <Nav>
              <Nav.Link
                href="https://github.com/greenham/helpasaur-king"
                target="_blank"
                rel="noopener,noreferrer"
              >
                <i className="fa-brands fa-github"></i>&nbsp;&nbsp;GitHub
              </Nav.Link>
              <NavDropdown
                title={
                  <>
                    <i className="fa-solid fa-link"></i>&nbsp;&nbsp;Resources
                  </>
                }
                id="resources-dropdown"
              >
                {RESOURCES.map((resource, index) =>
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
              {user ? (
                <NavDropdown
                  title={
                    <Image
                      src={user.twitchUserData.profile_image_url}
                      roundedCircle
                      className="bg-dark ml-3"
                      alt={"Logged in as " + user.twitchUserData.display_name}
                      width={32}
                      height={32}
                    />
                  }
                  id="user-dropdown"
                >
                  <NavDropdown.Item
                    href={
                      process.env.API_HOST +
                      "/auth/logout?redirect=" +
                      encodeURIComponent(location.pathname)
                    }
                    rel="noopener,noreferrer"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    &nbsp;&nbsp;Log Out
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Nav.Link href={getTwitchLoginUrl()} rel="noopener,noreferrer">
                  <Button variant="primary">
                    <i className="fa-solid fa-key"></i>&nbsp;&nbsp;Log in with
                    Twitch
                  </Button>
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default TopNav;
