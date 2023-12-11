import * as React from "react";
import { useEffect } from "react";
import { Alert, Container, ListGroup, Spinner } from "react-bootstrap";
import { useUser } from "../hooks/useUser";

interface AdminPageProps {}

const AdminPage: React.FunctionComponent<AdminPageProps> = () => {
  useEffect(() => {
    document.title = "Admin Panel | Helpasaur King";
  }, []);

  const { data: user, isLoading: userLoading } = useUser();

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
      <hr />

      <Alert variant="dark" className="p-5">
        <h2>TODO</h2>
        <ListGroup>
          <ListGroup.Item>
            <i className="fa-regular fa-square px-2"></i> Stream alerts
            management
          </ListGroup.Item>
          <ListGroup.Item>
            <i className="fa-regular fa-square px-2"></i> Twitch bot user
            management
          </ListGroup.Item>
          <ListGroup.Item>
            <i className="fa-regular fa-square px-2"></i> User management
          </ListGroup.Item>
          <ListGroup.Item>
            <i className="fa-regular fa-square px-2"></i> Command logs
          </ListGroup.Item>
        </ListGroup>
      </Alert>
    </Container>
  );
};

export default AdminPage;
