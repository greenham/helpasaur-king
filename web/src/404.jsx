import { useEffect } from "react";
import { Alert, Container } from "react-bootstrap";

export default function PageNotFound() {
  useEffect(() => {
    document.title = "Page Not Found | Helpasaur King";
  }, []);

  return (
    <>
      <Container className="mt-5">
        <Alert variant="dark" className="p-5">
          <Alert.Heading>
            <i class="fa-solid fa-circle-question"></i> Page Not Found
          </Alert.Heading>
          <p>The page you requested does not exist.</p>
        </Alert>
      </Container>
    </>
  );
}
