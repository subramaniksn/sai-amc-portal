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
    primary: { main: "#1976d2" },
    secondary: { main: "#ff9800" },
  },
});

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  // ✅ Fixed: Listen to localStorage changes properly
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
    };

    // Listen to storage events (works across tabs)
    window.addEventListener("storage", handleStorageChange);
    
    // Poll for local changes (fixes login issue)
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem("token");
      if (currentToken !== token) {
        setToken(currentToken);
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [token]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        {/* ✅ Navbar inside BrowserRouter */}
        {token && <Navbar />}
        
        <Container maxWidth="xl">
          <Box sx={{ mt: token ? 8 : 8 }}>
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
