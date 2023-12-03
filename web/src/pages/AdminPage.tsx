import * as React from "react";
import { useEffect } from "react";
import { UserContext } from "../contexts/user";
import { UserContextType } from "../types/users";
import { Alert, Container, Spinner } from "react-bootstrap";

interface AdminPageProps {}

const AdminPage: React.FunctionComponent<AdminPageProps> = () => {
  useEffect(() => {
    document.title = "Admin Panel | Helpasaur King";
  }, []);

  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user, isLoading: userLoading } = userContext;

  if (userLoading)
    return (
      <Container>
        <Spinner animation="border" role="statues">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );

  if (!user || !user.permissions.includes("admin"))
    return (
      <Container>
        <Alert variant="danger">
          You do not have permission to access this!
        </Alert>
      </Container>
    );

  return (
    <Container className="mt-5">
      <h1>
        <i className="fa-solid fa-user-tie"></i> Admin Panel
      </h1>

      <h2>Stream alerts management</h2>
      <h2>Twitch bot user management</h2>
      <h2>User management</h2>
      <h2>Command logs</h2>
    </Container>
  );
};

export default AdminPage;
