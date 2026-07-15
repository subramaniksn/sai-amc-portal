import { AppBar, Toolbar, Button, Typography, Box } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ SAFE USER PARSE
  let user = {};
  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      user = JSON.parse(storedUser);
    }
  } catch (err) {
    console.error("Invalid user data in localStorage:", err);
    user = {};
  }

  const isViewer = user?.role?.toLowerCase() === "viewer";
  const dashboardPath = isViewer ? "/viewer-sites" : "/dashboard";
  const isDashboard = location.pathname === dashboardPath;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
    navigate("/", { replace: true });
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        boxShadow: "0 2px 12px rgba(16, 24, 40, 0.18)"
      }}
    >
      <Toolbar>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexGrow: 1,
            minWidth: 0
          }}
        >
          <Box
            component="img"
            src="/sai_1.png"
            alt="Sai Solar and Industrial Automation Analytics"
            sx={{
              height: { xs: 36, sm: 44 },
              width: "auto",
              bgcolor: "rgba(255,255,255,0.96)",
              borderRadius: 1.5,
              px: 1,
              py: 0.5,
              objectFit: "contain"
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ lineHeight: 1.15 }}>
              AMC Management Portal
            </Typography>
            <Typography variant="caption" noWrap sx={{ opacity: 0.82, display: { xs: "none", sm: "block" } }}>
              {isViewer ? "Viewer Dashboard" : `${user?.role || "User"} Dashboard`}
            </Typography>
          </Box>
        </Box>

        {!isDashboard && (
          <Button color="inherit" onClick={() => navigate(dashboardPath)}>
            Dashboard
          </Button>
        )}

        <Button color="inherit" onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
