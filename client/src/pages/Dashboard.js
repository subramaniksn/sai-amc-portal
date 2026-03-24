import AdminDashboard from "./AdminDashboard";
import ViewerDashboard from "./ViewerDashboard";
import ManagerDashboard from "./ManagerDashboard";

export default function Dashboard() {

  let user = null;

  try {
    const userData = localStorage.getItem("user");
    user = userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Invalid user data in localStorage:", error);
    user = null;
  }

  // 🔐 If not logged in → redirect
  if (!user) {
    window.location.href = "/";
    return null;
  }

  const role = user.role;

  if (role === "Admin") {
    return <AdminDashboard />;
  }

  if (role === "Manager") {
    return <ManagerDashboard />;
  }

  if (role === "Viewer") {
    return <ViewerDashboard />;
  }

  return <div>Access Denied</div>;
}