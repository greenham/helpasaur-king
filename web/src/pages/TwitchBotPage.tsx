import * as React from "react";
import { useEffect } from "react";
import { Container } from "react-bootstrap";
import { UserContext } from "../contexts/user";
import { IUser, UserContextType } from "../types/users";

interface TwitchBotPageProps {}

const TwitchBotPage: React.FunctionComponent<TwitchBotPageProps> = () => {
  useEffect(() => {
    document.title = "Twitch Bot | Helpasaur King";
  }, []);

  const userContext = React.useContext(UserContext) as UserContextType;
  const { data: user } = userContext;

  return (
    <Container id="twitch-bot-page" className="my-5">
      <h1>
        <i className="fa-solid fa-robot"></i> Twitch Bot{" "}
      </h1>
      <hr />
      {user && <TwitchUserBotManagement user={user} />}
      {!user && <span>You're not logged in!</span>}
    </Container>
  );
};

interface TwitchUserBotManagementProps {
  user: IUser;
}
const TwitchUserBotManagement: React.FunctionComponent<
  TwitchUserBotManagementProps
> = (props) => {
  const { user } = props;
  return <h2>Hello, {user.twitchUserData.display_name}!</h2>;
};

export default TwitchBotPage;
