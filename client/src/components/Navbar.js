import { AppBar, Toolbar, Button, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isViewer = user.role === "viewer";
  const isDashboard = location.pathname === "/dashboard";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  return (
    <AppBar position="static">
      <Toolbar>

        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {isViewer ? "Viewer AMC Dashboard" : "AMC Dashboard"}
        </Typography>

        {/* Viewer Navbar */}
        {isViewer && (
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        )}

        {/* Admin Navbar */}
        {!isViewer && (
          <>
            {isDashboard && (
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            )}

            {!isDashboard && (
              <>
                <Button color="inherit" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button color="inherit" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            )}
          </>
        )}

      </Toolbar>
    </AppBar>
  );
}

export default Navbar;