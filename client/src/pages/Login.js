import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Link
} from "@mui/material";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const login = async () => {

    if (!email || !password) {
      alert("Please enter Email and Password");
      return;
    }

    try {

      setLoading(true);

      const res = await api.post("/auth/login", { email, password });

      // Save token
      localStorage.setItem("token", res.data.token);

      // Save user
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/dashboard", { replace: true });

    } catch (err) {

      alert("Invalid Email or Password");

    } finally {

      setLoading(false);

    }

  };

  // ENTER KEY SUPPORT
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login();
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >

      <Paper
        elevation={10}
        sx={{
          width: 380,
          padding: 4,
          borderRadius: 4,
          backdropFilter: "blur(15px)",
          background: "rgba(255,255,255,0.08)",
          color: "#fff"
        }}
      >

        {/* LOGO */}
        <Box textAlign="center" mb={2}>
          <img
            src="/sai-logo.png"
            alt="Sai Automation"
            style={{ width: 120 }}
          />
        </Box>

        <Typography variant="h5" gutterBottom align="center">
          Sai Automation AMC Portal
        </Typography>

        <TextField
          fullWidth
          type="email"
          label="Email"
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
          InputLabelProps={{ style: { color: "#ddd" } }}
          sx={{
            input: { color: "#fff" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#aaa" }
            }
          }}
        />

        <TextField
          fullWidth
          type="password"
          label="Password"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyPress}
          InputLabelProps={{ style: { color: "#ddd" } }}
          sx={{
            input: { color: "#fff" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#aaa" }
            }
          }}
        />

        <Box textAlign="right" mt={1}>
          <Link
            href="#"
            underline="hover"
            sx={{ color: "#90caf9", fontSize: 14 }}
          >
            Forgot Password?
          </Link>
        </Box>

        <Button
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{
            mt: 3,
            borderRadius: 3,
            background: "linear-gradient(45deg,#00c6ff,#0072ff)"
          }}
          onClick={login}
        >
          {loading ? "Signing In..." : "Sign In"}
        </Button>

        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 2, color: "#bbb" }}
        >
          © 2026 Sai Automation
        </Typography>

      </Paper>

    </Box>
  );
}
