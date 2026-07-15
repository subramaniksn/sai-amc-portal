import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, Container } from "@mui/material";
import { useState, useEffect } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AMCForm from "./pages/AMCForm";
import EditAMC from "./pages/EditAMC";
import ProtectedRoute from "./ProtectedRoute";
import Navbar from "./components/Navbar";
import ViewerDashboard from "./pages/ViewerDashboard";
import InvoiceList from "./pages/InvoiceList";

const theme = createTheme({
  palette: {
    primary: { main: "#155eef", dark: "#0b3ea8" },
    secondary: { main: "#f79009" },
    success: { main: "#079455" },
    warning: { main: "#dc6803" },
    error: { main: "#d92d20" },
    background: { default: "#f7f9fc", paper: "#ffffff" },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: "linear-gradient(100deg, #0b3ea8 0%, #155eef 70%, #2970ff 100%)" }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid #e4e7ec",
          boxShadow: "0 4px 14px rgba(16, 24, 40, 0.06)",
          transition: "transform 160ms ease, box-shadow 160ms ease"
        }
      }
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8, paddingInline: 18 } }
    }
  }
});

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  // ✅ Fixed: Listen to localStorage changes properly
  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem("token"));
    };

    // Listen to storage events (works across tabs)
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* ✅ Navbar inside BrowserRouter */}
        {token && <Navbar />}
        
        <Container maxWidth="xl">
          <Box sx={{ mt: token ? 4 : 0, pb: 5 }}>
            <Routes>
              {/* ✅ FIXED: Role-based login redirect */}
              <Route
                path="/"
                element={
                  token ? (
                    (() => {
                      try {
                        const user = JSON.parse(localStorage.getItem("user") || "{}");

                        let defaultPath = "/dashboard";

                        if (user.role === "Viewer") {
                          defaultPath = "/viewer-sites";
                        }

                        if (user.role === "Manager") {
                          defaultPath = "/dashboard";
                        }

                        return <Navigate to={defaultPath} replace />;
                      } catch {
                        return <Navigate to="/dashboard" replace />;
                      }
                    })()
                  ) : (
                    <Login />
                  )
                }
              />

              {/* Admin Dashboard - Full financial access */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute token={token}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Viewer Dashboard - Site directory only */}
              <Route
                path="/viewer-sites"
                element={
                  <ProtectedRoute token={token}>
                    <ViewerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoice-list/:type"
                element={
                  <ProtectedRoute token={token}>
                    <InvoiceList />
                  </ProtectedRoute>
                }
              />
              {/* Add AMC - Admin Only */}
              <Route
                path="/add-amc"
                element={
                  <ProtectedRoute token={token} role="Admin">
                    <AMCForm />
                  </ProtectedRoute>
                }
              />

              {/* Edit AMC - Admin Only */}
              <Route
                path="/edit/:id"
                element={
                  <ProtectedRoute token={token} role="Admin">
                    <EditAMC />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </Container>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
