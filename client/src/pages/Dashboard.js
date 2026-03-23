import AdminDashboard from "./AdminDashboard";
import ViewerDashboard from "./ViewerDashboard";
import ManagerDashboard from "./ManagerDashboard";

export default function Dashboard() {

  const user = JSON.parse(localStorage.getItem("user") || "{}");
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