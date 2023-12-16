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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStreamAlertsChannels,
  addChannelToStreamAlerts,
  removeChannelFromStreamAlerts,
} from "../utils/apiService";
import { TwitchUserData } from "../types/users";

interface AdminPageProps {}
const AdminPage: React.FunctionComponent<AdminPageProps> = () => {
  useEffect(() => {
    document.title = "Admin | Helpasaur King";
  }, []);

  const toast = useToast();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: streamAlertsChannels } = useQuery({
    queryKey: ["streamAlertsChannels"],
    queryFn: getStreamAlertsChannels,
  });
  const queryClient = useQueryClient();

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
      const { data: userAddResult } = await addChannelToStreamAlerts(userToAdd);
      const userResult = userAddResult[0].value;
      if (userResult.status === "success") {
        toast.success(`Added ${userToAdd} to stream alerts!`);
        setUserToAdd("");
        queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] });
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

  const [userToRemove, setUserToRemove] = React.useState("");
  const [userRemoveInProgress, setUserRemoveInProgress] = React.useState(false);
  const handleUserToRemoveInputChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setUserToRemove(value);
  };
  const handleRemoveUserFromStreamAlerts = async () => {
    setUserRemoveInProgress(true);
    try {
      const userResult = await removeChannelFromStreamAlerts(userToRemove);
      if (userResult.result === "success") {
        toast.success(`Removed ${userToRemove} from stream alerts!`);
        setUserToRemove("");
        queryClient.invalidateQueries({ queryKey: ["streamAlertsChannels"] });
      } else if (userResult.result === "noop") {
        toast.info(userResult.message);
      } else if (userResult.result === "error") {
        toast.error(userResult.message);
      }
    } catch (err) {
      toast.error(
        `Failed to remove ${userToRemove} from stream alerts: ${err}`
      );
    }
    setUserRemoveInProgress(false);
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
        <i className="fa-solid fa-user-tie"></i> Helpa Admin
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

      <Container>
        <h2>Remove User from Stream Alerts</h2>
        <Row>
          <Col>
            <FloatingLabel
              controlId="userToRemove"
              label="Choose a user to remove"
            >
              <Form.Select
                aria-label="Choose a user to remove"
                value={userToRemove}
                onChange={handleUserToRemoveInputChange}
              >
                <option>-</option>
                {streamAlertsChannels?.map((channel: TwitchUserData) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.display_name}
                  </option>
                ))}
              </Form.Select>
            </FloatingLabel>
          </Col>
          <Col>
            {userRemoveInProgress ? (
              <Spinner animation="border" role="statues">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            ) : (
              <Button
                variant="dark"
                onClick={handleRemoveUserFromStreamAlerts}
                size="lg"
                disabled={userRemoveInProgress}
              >
                <i className="fa-regular fa-square-minus px-1"></i> Remove User
              </Button>
            )}
          </Col>
        </Row>
      </Container>
    </Container>
  );
};

export default AdminPage;
