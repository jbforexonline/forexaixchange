import LoginErrorBoundary from "../../Components/Forms/LoginErrorBoundary.jsx";
import LogIn from "../../Components/Forms/LogIn.jsx";

export default function LoginPageWithBoundary(props) {
  return (
    <LoginErrorBoundary>
      <LogIn {...props} />
    </LoginErrorBoundary>
  );
}
