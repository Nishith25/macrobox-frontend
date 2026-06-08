// frontend/src/App.tsx (FRONTEND)

import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./router/AppRouter";

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("macrobox_theme");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.style.background = "#020617";
      document.body.style.color = "#f8fafc";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.style.background = "#f6f7f8";
      document.body.style.color = "#0f172a";
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}