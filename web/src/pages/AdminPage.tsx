import * as React from "react"
import { useEffect } from "react"
import { Alert, Container, Spinner } from "react-bootstrap"
import { useHelpaApi } from "../hooks/useHelpaApi"
import ManageStreamAlerts from "../components/Admin/ManageStreamAlerts"
import ManageTwitchBot from "../components/Admin/ManageTwitchBot"

interface AdminPageProps {}
const AdminPage: React.FunctionComponent<AdminPageProps> = () => {
  useEffect(() => {
    document.title = "Admin | Helpasaur King"
  }, [])

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
      <hr className="mb-5" />
      <h2>
        <i className="fa-brands fa-watchman-monitoring"></i> Runnerwatcher
      </h2>
      <ManageStreamAlerts />
      <hr className="my-5" />
      <h2>
        <i className="fa-solid fa-robot"></i> Twitch Bot
      </h2>
      <ManageTwitchBot />
    </Container>
  )
}

export default AdminPage
