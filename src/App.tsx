// frontend/src/App.tsx (FRONTEND)

import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./router/AppRouter";

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("macrobox_theme");
    const theme = savedTheme === "dark" ? "dark" : "light";

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.background = theme === "dark" ? "#020617" : "#f6f7f8";
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}