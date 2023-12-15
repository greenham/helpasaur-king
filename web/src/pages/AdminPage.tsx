import * as React from "react";
import { useEffect } from "react";
import {
  Alert,
  Button,
  Col,
  Container,
  FloatingLabel,
  Form,
  ListGroup,
  Row,
  Spinner,
} from "react-bootstrap";
import { useUser } from "../hooks/useUser";
import { useToast } from "../hooks/useToast";
import { addUserToStreamAlerts } from "../utils/apiService";

interface AdminPageProps {}

const AdminPage: React.FunctionComponent<AdminPageProps> = () => {
  useEffect(() => {
    document.title = "Admin Panel | Helpasaur King";
  }, []);

  const toast = useToast();
  const { data: user, isLoading: userLoading } = useUser();

  const [userToAdd, setUserToAdd] = React.useState("");
  const [userAddInProgress, setUserAddInProgress] = React.useState(false);
  const handleUserToAddInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setUserToAdd(value);
  };
  const handleAddUserToStreamAlerts = async () => {
    setUserAddInProgress(true);
    try {
      const { data: userAddResult } = await addUserToStreamAlerts(userToAdd);
      const userResult = userAddResult[0].value;
      if (userResult.status === "success") {
        toast.success(`Added ${userToAdd} to stream alerts!`);
        setUserToAdd("");
      } else if (userResult.status === "error") {
        toast.error(
          `Failed to add ${userToAdd} to stream alerts: ${userResult.message}`
        );
      }
    } catch (err) {
      toast.error(`Failed to add ${userToAdd} to stream alerts: ${err}`);
    }
    setUserAddInProgress(false);
  };

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

      <Container>
        <h2>Add User to Stream Alerts</h2>
        <Row>
          <Col>
            <FloatingLabel
              controlId="userToAdd"
              label="Twitch username"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="pokimane"
                name="userToAdd"
                value={userToAdd}
                onChange={handleUserToAddInputChange}
                autoComplete="off"
              />
            </FloatingLabel>
          </Col>
          <Col>
            {userAddInProgress ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleAddUserToStreamAlerts}
                size="lg"
                disabled={userAddInProgress}
              >
                <i className="fa-regular fa-square-plus px-1"></i> Add User
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AdminPage;
