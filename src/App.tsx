// frontend/src/App.tsx (FRONTEND)

import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./router/AppRouter";

function applySavedTheme() {
  const savedTheme = localStorage.getItem("macrobox_theme");
  const theme = savedTheme === "dark" ? "dark" : "light";

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.setAttribute("data-theme", theme);

  document.body.style.background = theme === "dark" ? "#020617" : "#f6f7f8";
  document.body.style.color = theme === "dark" ? "#f8fafc" : "#0f172a";
}

export default function App() {
  useEffect(() => {
    applySavedTheme();

    const handleThemeChange = () => applySavedTheme();

    window.addEventListener("macrobox-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    return () => {
      window.removeEventListener("macrobox-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}