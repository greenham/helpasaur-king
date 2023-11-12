import { useRouteError } from "react-router-dom";
import TopNav from "./components/TopNav";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <Container>
      <TopNav />
      <Alert variant="warning" data-bs-theme="light">
        <Alert.Heading>
          <i class="fa-solid fa-circle-exclamation"></i> Oops!
        </Alert.Heading>
        <p>Sorry, an unexpected error has occurred.</p>
        <hr />
        <p>
          <i>{error.statusText || error.message}</i>
        </p>
      </Alert>
    </Container>
  );
}
