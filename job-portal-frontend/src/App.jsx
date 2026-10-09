import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import OAuthLogin from "./components/OAuthLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import Register from "./components/Register";
import Workspace from "./workspace/Workspace";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="register" element={<Register />} />
        {["applicant-dashboard", "admin-dashboard", "recruiter-dashboard"].map(
          (path) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
          ),
        )}
        <Route path="/oauthlogon" element={<OAuthLogin />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
