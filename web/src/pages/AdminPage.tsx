import * as React from "react"
import { useEffect, useState } from "react"
import { Alert, Container, Spinner, Tabs, Tab, Card } from "react-bootstrap"
import { useLocation, useNavigate } from "react-router-dom"
import { useHelpaApi } from "../hooks/useHelpaApi"
import CommandStats from "../components/Admin/CommandStats"
import ManageStreamAlerts from "../components/Admin/ManageStreamAlerts"
import ManageTwitchBot from "../components/Admin/ManageTwitchBot"
import TestEvents from "../components/Admin/TestEvents"

interface AdminPageProps {}
const AdminPage: React.FunctionComponent<AdminPageProps> = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // Get initial tab from URL hash or localStorage
  const getInitialTab = () => {
    const hash = location.hash.replace("#", "")
    if (hash && ["stats", "alerts", "bot", "testing"].includes(hash)) {
      return hash
    }
    return localStorage.getItem("adminActiveTab") || "stats"
  }

  const [activeKey, setActiveKey] = useState(getInitialTab())

  useEffect(() => {
    document.title = "Admin | Helpasaur King"
  }, [])

  // Handle tab change
  const handleTabSelect = (key: string | null) => {
    if (key) {
      setActiveKey(key)
      localStorage.setItem("adminActiveTab", key)
      navigate(`#${key}`, { replace: true })
    }
  }

  const { data: user, isLoading: userLoading } = useHelpaApi().useUser()

  if (userLoading)
    return (
      <Container>
        <Spinner animation="border" role="statues">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    )

  if (!user || !user.permissions.includes("admin"))
    return (
      <Container>
        <Alert variant="danger">
          You do not have permission to access this!
        </Alert>
      </Container>
    )

  return (
    <Container className="mt-5">
      <h1>
        <i className="fa-solid fa-user-tie"></i> Helpa Admin
      </h1>
      <hr className="my-4" />

      <Card className="admin-tabs-container">
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeKey}
            onSelect={handleTabSelect}
            id="admin-tabs"
            className="admin-tabs"
            variant="pills"
          >
            <Tab
              eventKey="stats"
              title={
                <>
                  <i className="fa-solid fa-chart-simple me-2"></i>
                  Statistics
                </>
              }
              className="p-5"
            >
              <CommandStats />
            </Tab>

            <Tab
              eventKey="alerts"
              title={
                <>
                  <i className="fa-brands fa-watchman-monitoring me-2"></i>
                  Stream Alerts
                </>
              }
              className="p-5"
            >
              <ManageStreamAlerts />
            </Tab>

            <Tab
              eventKey="bot"
              title={
                <>
                  <i className="fa-solid fa-robot me-2"></i>
                  Twitch Bot
                </>
              }
              className="p-5"
            >
              <ManageTwitchBot />
            </Tab>

            <Tab
              eventKey="testing"
              title={
                <>
                  <i className="fa-solid fa-vial-circle-check me-2"></i>
                  Test Events
                </>
              }
              className="p-5"
            >
              <TestEvents />
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  )
}

export default AdminPage
