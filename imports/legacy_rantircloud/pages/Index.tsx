import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to the dashboard
  return <Navigate to="/" replace />;
};

export default Index;
