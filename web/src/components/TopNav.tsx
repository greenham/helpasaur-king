import * as React from "react"
import {
  Button,
  Image,
  Navbar,
  Nav,
  NavDropdown,
  OverlayTrigger,
  Popover,
} from "react-bootstrap"
import { LinkContainer } from "react-router-bootstrap"
import { getTwitchLoginUrl, getLogoutUrl } from "../utils"
import { useLocation } from "react-router-dom"
import { useHelpaApi } from "../hooks/useHelpaApi"

const popover = (
  <Popover placement="bottom" id="helpa-popover">
    <Popover.Header as="h3">Hello!</Popover.Header>
    <Popover.Body className="bg-dark">
      I'm <strong>Helpasaur King</strong> and I'm very high in potassium... like
      a banana! 🍌
    </Popover.Body>
  </Popover>
)

function TopNav() {
  const { data: user, isPending: userIsPending } = useHelpaApi().useUser()
  const { data: config, isPending: configIsPending } = useHelpaApi().useConfig()
  const logo = new URL("../img/logo.png", import.meta.url).toString()
  const location = useLocation()

  return (
    <>
      <Navbar expand="lg" bg="dark" sticky="top" className="px-3">
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
                <i className="fa-solid fa-terminal pe-1"></i>Commands
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="streams">
              <Nav.Link>
                <i className="fa-brands fa-twitch pe-1"></i>ALttP Streams
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="twitch">
              <Nav.Link>
                <i className="fa-solid fa-robot pe-1"></i>Twitch Bot
              </Nav.Link>
            </LinkContainer>
            <LinkContainer to="discord">
              <Nav.Link>
                <i className="fa-brands fa-discord pe-1"></i>Discord Bot
              </Nav.Link>
            </LinkContainer>
            {user && user.permissions.includes("admin") && (
              <LinkContainer to="admin">
                <Nav.Link>
                  <i className="fa-solid fa-user-tie pe-1"></i>Admin
                </Nav.Link>
              </LinkContainer>
            )}
          </Nav>
          <Nav>
            <Nav.Link
              href="https://github.com/greenham/helpasaur-king"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fa-brands fa-github pe-1"></i>GitHub
            </Nav.Link>

            <NavDropdown
              title={
                <>
                  <i className="fa-solid fa-link pe-1"></i>Resources
                </>
              }
              id="resources-dropdown"
              align="end"
            >
              {!configIsPending &&
                config &&
                config.resources &&
                config.resources.length > 0 &&
                config.resources.map((resource, index) =>
                  resource.divider ? (
                    <NavDropdown.Divider key={index} />
                  ) : (
                    <NavDropdown.Item
                      key={index}
                      href={resource.href}
                      target={resource.target}
                      rel={resource.rel}
                    >
                      <i className={`${resource.icon} pe-1`}></i>
                      {resource.text}
                    </NavDropdown.Item>
                  )
                )}
            </NavDropdown>
          </Nav>
          <Nav className="justify-content-end">
            {!userIsPending && user && (
              <NavDropdown
                title={
                  <Image
                    src={user.twitchUserData.profile_image_url}
                    roundedCircle
                    className="bg-dark ml-3"
                    alt={`Logged in as ${user.twitchUserData.display_name}`}
                    width={32}
                    height={32}
                  />
                }
                id="user-dropdown"
                align="end"
              >
                <NavDropdown.Item
                  href={getLogoutUrl(location.pathname)}
                  rel="noopener noreferrer"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i> Log
                  Out
                </NavDropdown.Item>
              </NavDropdown>
            )}
            {!userIsPending && !user && (
              <Nav.Link href={getTwitchLoginUrl()} rel="noopener noreferrer">
                <Button variant="primary">
                  <i className="fa-solid fa-key pe-1"></i>Log in with Twitch
                </Button>
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </>
  )
}

export default TopNav
