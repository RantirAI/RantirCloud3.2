
// This page is no longer used. Redirect to /auth.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
const Login = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/auth", { replace: true }); }, [navigate]);
  return null;
};
export default Login;
